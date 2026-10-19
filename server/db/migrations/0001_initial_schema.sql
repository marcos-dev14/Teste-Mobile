-- 0001 — Schema inicial da v2 (substitui o schema Prisma).
-- Decisões: docs/02-arquitetura.md (ADR-03, ADR-04).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() não é IMMUTABLE; este wrapper com dicionário explícito pode ser usado em índice.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Usuários ---------------------------------------------------------------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text   NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email         citext NOT NULL UNIQUE CHECK (char_length(email) <= 254),
  password_hash text   NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Refresh tokens (armazenados apenas como hash SHA-256) ------------------
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  family_id   uuid  NOT NULL,
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_id_idx   ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_replaced_by_idx ON refresh_tokens (replaced_by);

-- Catálogo -----------------------------------------------------------------
CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  rating      numeric(2,1) CHECK (rating BETWEEN 0 AND 5),
  image_urls  text[] NOT NULL CHECK (cardinality(image_urls) >= 1),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Busca por nome sem acento e sem diferenciar maiúsculas (f_unaccent(name) ILIKE '%termo%').
CREATE INDEX products_name_trgm_idx ON products USING gin (f_unaccent(name) gin_trgm_ops);
-- Ordenações paginadas da listagem (somente ativos).
CREATE INDEX products_active_price_idx    ON products (price_cents, id) WHERE is_active;
CREATE INDEX products_active_created_idx  ON products (created_at DESC, id) WHERE is_active;
CREATE INDEX products_active_featured_idx ON products (rating DESC NULLS LAST, name, id) WHERE is_active;

-- Cores: a unidade de compra (cada cor tem seu estoque e suas imagens).
CREATE TABLE product_colors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  hex        text NOT NULL CHECK (hex ~ '^#[0-9A-F]{6}$'),
  image_urls text[] NOT NULL CHECK (cardinality(image_urls) >= 1),
  stock      integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  position   smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);
CREATE TRIGGER product_colors_set_updated_at BEFORE UPDATE ON product_colors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX product_colors_product_id_idx ON product_colors (product_id, position);

-- Endereços ---------------------------------------------------------------
CREATE TABLE addresses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  full_name      text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 100),
  address_line1  text NOT NULL CHECK (char_length(address_line1) BETWEEN 3 AND 120),
  address_line2  text CHECK (char_length(address_line2) <= 120),
  city           text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  state          text NOT NULL CHECK (char_length(state) BETWEEN 2 AND 40),
  zip_code       text NOT NULL CHECK (zip_code ~ '^[0-9]{5}-[0-9]{3}$'),
  country        text NOT NULL CHECK (char_length(country) BETWEEN 2 AND 60),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER addresses_set_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX addresses_user_id_idx ON addresses (user_id, created_at DESC);

-- Pedidos -----------------------------------------------------------------
CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number           bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  user_id          uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  address_id       uuid REFERENCES addresses (id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'placed'
                   CHECK (status IN ('placed', 'paid', 'shipped', 'delivered', 'cancelled')),
  payment_method   text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  item_count       integer NOT NULL CHECK (item_count > 0),
  subtotal_cents   integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents   integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents      integer NOT NULL CHECK (total_cents = subtotal_cents + shipping_cents),
  -- Cópia imutável do endereço no momento da compra.
  shipping_address jsonb NOT NULL,
  idempotency_key  uuid NOT NULL,
  -- SHA-256 do corpo normalizado: mesma chave com outro conteúdo é rejeitada.
  request_fingerprint text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC, id);
CREATE INDEX orders_address_id_idx ON orders (address_id);

CREATE TABLE order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  color_id         uuid NOT NULL REFERENCES product_colors (id) ON DELETE RESTRICT,
  -- Snapshot do item no momento da compra.
  product_name     text NOT NULL,
  color_name       text NOT NULL,
  color_hex        text NOT NULL,
  image_url        text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity         integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_cents integer NOT NULL CHECK (line_total_cents = unit_price_cents * quantity),
  UNIQUE (order_id, color_id)
);
-- order_id já é coberto pelo índice da UNIQUE (order_id, color_id).
CREATE INDEX order_items_product_id_idx ON order_items (product_id);
CREATE INDEX order_items_color_id_idx   ON order_items (color_id);
