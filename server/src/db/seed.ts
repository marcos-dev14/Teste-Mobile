import { hashPassword } from '../lib/passwords.js'
import type { Pool } from './pool.js'
import { withTransaction } from './transaction.js'
import { demoUser, seedProducts, type SeedProduct } from './seed-data.js'

export interface SeedResult {
  products: number
  colors: number
  demoUserCreated: boolean
}

/**
 * Idempotente: produtos são identificados pelo slug e cores por (produto, nome).
 * Campos de catálogo são atualizados; o estoque só é definido na criação da cor,
 * para que reexecutar o seed não "devolva" estoque consumido por pedidos.
 */
export async function seed(pool: Pool, products: SeedProduct[] = seedProducts): Promise<SeedResult> {
  let colorCount = 0
  await withTransaction(pool, async (tx) => {
    for (const product of products) {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO products (slug, name, description, price_cents, rating, image_urls)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price_cents = EXCLUDED.price_cents,
           rating = EXCLUDED.rating,
           image_urls = EXCLUDED.image_urls,
           is_active = true
         RETURNING id`,
        [
          product.slug,
          product.name,
          product.description,
          product.priceCents,
          product.rating,
          product.colors.flatMap((color) => color.imageUrls),
        ],
      )
      const productId = rows[0]!.id
      for (const [position, color] of product.colors.entries()) {
        await tx.query(
          `INSERT INTO product_colors (product_id, name, hex, image_urls, stock, position)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (product_id, name) DO UPDATE SET
             hex = EXCLUDED.hex,
             image_urls = EXCLUDED.image_urls,
             position = EXCLUDED.position`,
          [productId, color.name, color.hex, color.imageUrls, color.stock, position],
        )
        colorCount += 1
      }
    }
  })

  const passwordHash = await hashPassword(demoUser.password)
  const { rowCount } = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [demoUser.name, demoUser.email, passwordHash],
  )

  return { products: products.length, colors: colorCount, demoUserCreated: rowCount === 1 }
}
