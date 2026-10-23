import type { Queryable } from '../../db/pool.js'
import type { PaymentIntentStatus, PaymentMethodKind } from './gateway.js'

export interface PayableOrder {
  id: string
  userId: string
  status: string
  paymentMethod: 'credit_card' | 'pix' | 'boleto'
  totalCents: number
  reservedUntil: Date | null
  /** A reserva de estoque ainda vale (relógio do banco). */
  reservationActive: boolean
}

interface PayableOrderRow {
  id: string
  user_id: string
  status: string
  payment_method: PayableOrder['paymentMethod']
  total_cents: number
  reserved_until: Date | null
  reservation_active: boolean
}

const toPayable = (row: PayableOrderRow): PayableOrder => ({
  id: row.id,
  userId: row.user_id,
  status: row.status,
  paymentMethod: row.payment_method,
  totalCents: row.total_cents,
  reservedUntil: row.reserved_until,
  reservationActive: row.reservation_active,
})

const ORDER_COLUMNS = `id, user_id, status, payment_method, total_cents, reserved_until,
  (reserved_until IS NOT NULL AND reserved_until > now()) AS reservation_active`

/** Sempre filtrado pelo dono: pedido de outro usuário é indistinguível de inexistente. */
export async function findOrderForUser(db: Queryable, userId: string, orderId: string): Promise<PayableOrder | null> {
  const { rows } = await db.query<PayableOrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  )
  return rows[0] ? toPayable(rows[0]) : null
}

export async function lockOrder(db: Queryable, orderId: string): Promise<PayableOrder | null> {
  const { rows } = await db.query<PayableOrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 FOR UPDATE`, [orderId])
  return rows[0] ? toPayable(rows[0]) : null
}

export interface PaymentRecord {
  id: string
  orderId: string
  paymentIntentId: string
  method: PaymentMethodKind
  status: PaymentIntentStatus
  failureCode: string | null
  amountCents: number
  currency: string
}

interface PaymentRow {
  id: string
  order_id: string
  provider_payment_intent_id: string
  method: PaymentMethodKind
  status: PaymentIntentStatus
  failure_code: string | null
  amount_cents: number
  currency: string
}

const toPayment = (row: PaymentRow): PaymentRecord => ({
  id: row.id,
  orderId: row.order_id,
  paymentIntentId: row.provider_payment_intent_id,
  method: row.method,
  status: row.status,
  failureCode: row.failure_code,
  amountCents: row.amount_cents,
  currency: row.currency,
})

const PAYMENT_COLUMNS = 'id, order_id, provider_payment_intent_id, method, status, failure_code, amount_cents, currency'

export async function findPaymentByOrder(db: Queryable, orderId: string): Promise<PaymentRecord | null> {
  const { rows } = await db.query<PaymentRow>(`SELECT ${PAYMENT_COLUMNS} FROM payments WHERE order_id = $1`, [orderId])
  return rows[0] ? toPayment(rows[0]) : null
}

export async function findPaymentByIntent(db: Queryable, paymentIntentId: string): Promise<PaymentRecord | null> {
  const { rows } = await db.query<PaymentRow>(
    `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE provider_payment_intent_id = $1`,
    [paymentIntentId],
  )
  return rows[0] ? toPayment(rows[0]) : null
}

/** Trave o pedido antes (ordem fixa pedido → pagamento em todos os caminhos). */
export async function lockPaymentByIntent(db: Queryable, paymentIntentId: string): Promise<PaymentRecord | null> {
  const { rows } = await db.query<PaymentRow>(
    `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE provider_payment_intent_id = $1 FOR UPDATE`,
    [paymentIntentId],
  )
  return rows[0] ? toPayment(rows[0]) : null
}

/** Retorna false se outra requisição já registrou o pagamento deste pedido. */
export async function insertPayment(
  db: Queryable,
  input: {
    orderId: string
    paymentIntentId: string
    method: PaymentMethodKind
    status: PaymentIntentStatus
    amountCents: number
    currency: string
  },
): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO payments (order_id, provider_payment_intent_id, method, status, amount_cents, currency)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (order_id) DO NOTHING`,
    [input.orderId, input.paymentIntentId, input.method, input.status, input.amountCents, input.currency],
  )
  return rowCount === 1
}

export async function setPaymentState(
  db: Queryable,
  paymentId: string,
  state: { status: PaymentIntentStatus; failureCode: string | null },
): Promise<void> {
  await db.query('UPDATE payments SET status = $2, failure_code = $3 WHERE id = $1', [
    paymentId,
    state.status,
    state.failureCode?.slice(0, 100) ?? null,
  ])
}

export interface PayerRecord {
  name: string
  email: string
  shippingAddress: { addressLine1: string; number: string | null; city: string; state: string; zipCode: string }
}

/** Nome e e-mail da conta + endereço de entrega copiado no pedido (usado como endereço do boleto). */
export async function findPayer(db: Queryable, orderId: string): Promise<PayerRecord | null> {
  const { rows } = await db.query<{ name: string; email: string; shipping_address: PayerRecord['shippingAddress'] }>(
    `SELECT u.name, u.email, o.shipping_address
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.id = $1`,
    [orderId],
  )
  const row = rows[0]
  return row ? { name: row.name, email: row.email, shippingAddress: row.shipping_address } : null
}

export async function setOrderStatus(db: Queryable, orderId: string, status: string): Promise<void> {
  // Fora de "aguardando pagamento" a reserva deixa de existir.
  await db.query('UPDATE orders SET status = $2, reserved_until = NULL WHERE id = $1', [orderId, status])
}

/** Devolve ao estoque as unidades do pedido, travando as cores em ordem de id (evita deadlock). */
export async function restockOrder(db: Queryable, orderId: string): Promise<void> {
  await db.query(
    `SELECT pc.id FROM product_colors pc
       JOIN order_items oi ON oi.color_id = pc.id
      WHERE oi.order_id = $1
      ORDER BY pc.id
      FOR UPDATE OF pc`,
    [orderId],
  )
  await db.query(
    `UPDATE product_colors pc SET stock = pc.stock + oi.quantity
       FROM order_items oi
      WHERE oi.order_id = $1 AND pc.id = oi.color_id`,
    [orderId],
  )
}

/** Registra o evento; false se já foi processado (entrega duplicada do webhook). */
export async function recordEvent(db: Queryable, eventId: string, type: string): Promise<boolean> {
  const { rowCount } = await db.query(
    'INSERT INTO payment_events (provider_event_id, type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [eventId, type],
  )
  return rowCount === 1
}

export async function listExpiredPendingOrders(db: Queryable, limit: number): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM orders
      WHERE status = 'pending_payment' AND reserved_until <= now()
        AND (next_expiration_check_at IS NULL OR next_expiration_check_at <= now())
      ORDER BY reserved_until LIMIT $1`,
    [limit],
  )
  return rows.map((row) => row.id)
}

/** Pedido vencido que ainda não pode ser encerrado: volta à fila só depois do intervalo. */
export async function postponeExpirationCheck(db: Queryable, orderId: string, minutes: number): Promise<void> {
  await db.query(
    `UPDATE orders SET next_expiration_check_at = now() + make_interval(mins => $2)
      WHERE id = $1 AND status = 'pending_payment'`,
    [orderId, minutes],
  )
}

/**
 * Reembolsos devidos: pagamento confirmado num pedido já encerrado. A própria combinação de
 * estados é o registro durável — sobrevive a falha do Stripe ou queda do processo.
 */
export async function listPendingRefunds(db: Queryable, limit: number): Promise<{ orderId: string; paymentIntentId: string }[]> {
  const { rows } = await db.query<{ order_id: string; provider_payment_intent_id: string }>(
    `SELECT p.order_id, p.provider_payment_intent_id
       FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE p.status = 'succeeded' AND o.status IN ('cancelled', 'expired')
      ORDER BY p.updated_at LIMIT $1`,
    [limit],
  )
  return rows.map((row) => ({ orderId: row.order_id, paymentIntentId: row.provider_payment_intent_id }))
}
