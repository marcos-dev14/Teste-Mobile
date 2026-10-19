import type { Queryable } from '../../db/pool.js'
import type { PricedLine } from './pricing.js'
import type { OrderDetailDto, OrderSummaryDto, ShippingAddress } from './schemas.js'

interface OrderRow {
  id: string
  number: string // bigint chega como string no node-postgres
  status: OrderDetailDto['status']
  payment_method: OrderDetailDto['paymentMethod']
  item_count: number
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  shipping_address: ShippingAddress
  request_fingerprint: string
  created_at: Date
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  color_id: string
  product_name: string
  color_name: string
  color_hex: string
  image_url: string
  unit_price_cents: number
  quantity: number
  line_total_cents: number
}

const ORDER_COLUMNS = `id, number, status, payment_method, item_count, subtotal_cents, shipping_cents,
  total_cents, shipping_address, request_fingerprint, created_at`

function toDetail(row: OrderRow, items: OrderItemRow[]): OrderDetailDto {
  return {
    id: row.id,
    number: Number(row.number),
    status: row.status,
    paymentMethod: row.payment_method,
    itemCount: row.item_count,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    createdAt: row.created_at.toISOString(),
    shippingAddress: row.shipping_address,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      colorId: item.color_id,
      productName: item.product_name,
      colorName: item.color_name,
      colorHex: item.color_hex,
      imageUrl: item.image_url,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
  }
}

async function loadItems(db: Queryable, orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return []
  const { rows } = await db.query<OrderItemRow>(
    `SELECT id, order_id, product_id, color_id, product_name, color_name, color_hex, image_url,
            unit_price_cents, quantity, line_total_cents
       FROM order_items WHERE order_id = ANY($1::uuid[])
      ORDER BY order_id, product_name, id`,
    [orderIds],
  )
  return rows
}

export async function findOrderForUser(
  db: Queryable,
  userId: string,
  orderId: string,
): Promise<OrderDetailDto | null> {
  const { rows } = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  )
  const row = rows[0]
  return row ? toDetail(row, await loadItems(db, [row.id])) : null
}

export async function findOrderByIdempotencyKey(
  db: Queryable,
  userId: string,
  key: string,
): Promise<{ order: OrderDetailDto; fingerprint: string } | null> {
  const { rows } = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, key],
  )
  const row = rows[0]
  return row
    ? { order: toDetail(row, await loadItems(db, [row.id])), fingerprint: row.request_fingerprint }
    : null
}

/** Lista paginada + itens de prévia em 3 consultas fixas (sem N+1). */
export async function listOrdersForUser(
  db: Queryable,
  userId: string,
  limit: number,
  offset: number,
): Promise<{ items: OrderSummaryDto[]; total: number }> {
  const [page, count] = await Promise.all([
    db.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = $1
        ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    db.query<{ total: number }>('SELECT count(*)::int AS total FROM orders WHERE user_id = $1', [userId]),
  ])
  const items = await loadItems(
    db,
    page.rows.map((row) => row.id),
  )
  const imagesByOrder = new Map<string, string[]>()
  for (const item of items) {
    const images = imagesByOrder.get(item.order_id) ?? []
    if (images.length < 3) images.push(item.image_url)
    imagesByOrder.set(item.order_id, images)
  }
  return {
    total: count.rows[0]?.total ?? 0,
    items: page.rows.map((row) => ({
      id: row.id,
      number: Number(row.number),
      status: row.status,
      paymentMethod: row.payment_method,
      itemCount: row.item_count,
      totalCents: row.total_cents,
      createdAt: row.created_at.toISOString(),
      previewImageUrls: imagesByOrder.get(row.id) ?? [],
    })),
  }
}

/** Decremento condicional: defesa extra além do FOR UPDATE. Retorna false se faltou estoque. */
export async function decrementStock(db: Queryable, colorId: string, quantity: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE product_colors SET stock = stock - $2 WHERE id = $1 AND stock >= $2',
    [colorId, quantity],
  )
  return rowCount === 1
}

export interface NewOrder {
  userId: string
  addressId: string
  paymentMethod: OrderDetailDto['paymentMethod']
  itemCount: number
  subtotalCents: number
  shippingCents: number
  totalCents: number
  shippingAddress: ShippingAddress
  idempotencyKey: string
  requestFingerprint: string
}

/** Retorna null se outra transação já gravou um pedido com a mesma chave de idempotência. */
export async function insertOrder(db: Queryable, order: NewOrder, lines: PricedLine[]): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO orders (user_id, address_id, payment_method, item_count, subtotal_cents, shipping_cents,
                         total_cents, shipping_address, idempotency_key, request_fingerprint)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, idempotency_key) DO NOTHING
     RETURNING id`,
    [
      order.userId,
      order.addressId,
      order.paymentMethod,
      order.itemCount,
      order.subtotalCents,
      order.shippingCents,
      order.totalCents,
      order.shippingAddress,
      order.idempotencyKey,
      order.requestFingerprint,
    ],
  )
  const orderId = rows[0]?.id
  if (!orderId) return null

  // Inserção em lote dos itens numa única instrução.
  await db.query(
    `INSERT INTO order_items (order_id, product_id, color_id, product_name, color_name, color_hex,
                              image_url, unit_price_cents, quantity, line_total_cents)
     SELECT $1, * FROM unnest($2::uuid[], $3::uuid[], $4::text[], $5::text[], $6::text[],
                              $7::text[], $8::int[], $9::int[], $10::int[])`,
    [
      orderId,
      lines.map((line) => line.productId),
      lines.map((line) => line.colorId),
      lines.map((line) => line.productName),
      lines.map((line) => line.colorName),
      lines.map((line) => line.colorHex),
      lines.map((line) => line.imageUrl),
      lines.map((line) => line.unitPriceCents),
      lines.map((line) => line.quantity),
      lines.map((line) => line.lineTotalCents),
    ],
  )
  return orderId
}
