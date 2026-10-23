-- 0003 — Pagamentos (Stripe, somente modo de teste). Decisões: docs/audit/checkout-stripe.md.
-- Aditiva: pedidos existentes ('placed') não são reescritos.

-- Novos status: aguardando pagamento e reembolsado.
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment', 'placed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'));
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_payment';

-- Até quando o estoque fica reservado para um pedido não pago.
ALTER TABLE orders ADD COLUMN reserved_until timestamptz;

-- Busca dos pedidos com reserva vencida (rotina de expiração).
CREATE INDEX orders_pending_reserved_idx ON orders (reserved_until) WHERE status = 'pending_payment';

-- Um pagamento por pedido. Nenhum dado de cartão: só o identificador do PaymentIntent.
CREATE TABLE payments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  uuid NOT NULL UNIQUE REFERENCES orders (id) ON DELETE RESTRICT,
  provider                  text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  provider_payment_intent_id text NOT NULL UNIQUE,
  status                    text NOT NULL CHECK (status IN (
                              'requires_payment_method', 'requires_confirmation', 'requires_action',
                              'processing', 'requires_capture', 'succeeded', 'canceled')),
  amount_cents              integer NOT NULL CHECK (amount_cents > 0),
  currency                  text NOT NULL CHECK (currency = 'brl'),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Deduplicação de webhooks: o mesmo evento entregue duas vezes é processado uma vez.
CREATE TABLE payment_events (
  provider_event_id text PRIMARY KEY,
  type              text NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now()
);
