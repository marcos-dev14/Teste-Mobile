import type { Queryable } from '../../db/pool.js'
import type { ProductDetailDto, ProductSort, ProductSummaryDto } from './schemas.js'

// Whitelist: a cláusula ORDER BY nunca é montada a partir de texto do cliente.
const ORDER_BY: Record<ProductSort, string> = {
  featured: 'p.rating DESC NULLS LAST, p.name, p.id',
  price_asc: 'p.price_cents ASC, p.id',
  price_desc: 'p.price_cents DESC, p.id',
  newest: 'p.created_at DESC, p.id',
}

/** Escapa curingas do LIKE para que a busca seja literal. */
export function toLikePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

const parseRating = (value: string | null) => (value === null ? null : Number(value))

interface SummaryRow {
  id: string
  slug: string
  name: string
  price_cents: number
  rating: string | null
  image_url: string
  colors: { id: string; name: string; hex: string }[]
  in_stock: boolean
}

export async function listProducts(
  db: Queryable,
  params: { search?: string; sort: ProductSort; limit: number; offset: number },
): Promise<{ items: ProductSummaryDto[]; total: number }> {
  const pattern = params.search ? toLikePattern(params.search) : null
  const where = 'p.is_active AND ($1::text IS NULL OR f_unaccent(p.name) ILIKE f_unaccent($1))'

  const [page, count] = await Promise.all([
    db.query<SummaryRow>(
      `SELECT p.id, p.slug, p.name, p.price_cents, p.rating::text AS rating,
              p.image_urls[1] AS image_url,
              COALESCE(c.colors, '[]'::json) AS colors,
              COALESCE(c.in_stock, false) AS in_stock
         FROM products p
         LEFT JOIN LATERAL (
           SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'hex', pc.hex)
                           ORDER BY pc.position) AS colors,
                  bool_or(pc.stock > 0) AS in_stock
             FROM product_colors pc
            WHERE pc.product_id = p.id
         ) c ON true
        WHERE ${where}
        ORDER BY ${ORDER_BY[params.sort]}
        LIMIT $2 OFFSET $3`,
      [pattern, params.limit, params.offset],
    ),
    db.query<{ total: number }>(`SELECT count(*)::int AS total FROM products p WHERE ${where}`, [pattern]),
  ])

  return {
    total: count.rows[0]?.total ?? 0,
    items: page.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      priceCents: row.price_cents,
      rating: parseRating(row.rating),
      imageUrl: row.image_url,
      colors: row.colors,
      inStock: row.in_stock,
    })),
  }
}

interface DetailRow {
  id: string
  slug: string
  name: string
  description: string
  price_cents: number
  rating: string | null
  image_urls: string[]
  colors: { id: string; name: string; hex: string; imageUrls: string[]; stock: number }[]
}

export async function findActiveProductById(db: Queryable, id: string): Promise<ProductDetailDto | null> {
  const { rows } = await db.query<DetailRow>(
    `SELECT p.id, p.slug, p.name, p.description, p.price_cents, p.rating::text AS rating, p.image_urls,
            COALESCE(
              (SELECT json_agg(json_build_object(
                        'id', pc.id, 'name', pc.name, 'hex', pc.hex,
                        'imageUrls', pc.image_urls, 'stock', pc.stock)
                      ORDER BY pc.position)
                 FROM product_colors pc WHERE pc.product_id = p.id),
              '[]'::json) AS colors
       FROM products p
      WHERE p.id = $1 AND p.is_active`,
    [id],
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    rating: parseRating(row.rating),
    imageUrls: row.image_urls,
    colors: row.colors,
    inStock: row.colors.some((color) => color.stock > 0),
  }
}
