import type { Queryable } from './pool.js'

/**
 * Verificações de integridade somente leitura (pedidos × pagamentos × estoque). Cada uma conta
 * registros que não deveriam existir; qualquer valor acima de zero merece investigação.
 * Uso: `pnpm db:integrity` (código de saída 1 se houver anomalia) — adequado a um cron/monitor.
 */
export const INTEGRITY_CHECKS: { id: string; description: string; sql: string }[] = [
  {
    id: 'paid_without_payment',
    description: 'Pedido pago sem pagamento confirmado no Stripe',
    sql: `SELECT count(*)::int AS n FROM orders o WHERE o.status = 'paid'
            AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'succeeded')`,
  },
  {
    id: 'payment_without_paid_order',
    description: 'Pagamento confirmado em pedido aguardando pagamento (reconciliação pendente)',
    sql: `SELECT count(*)::int AS n FROM payments p JOIN orders o ON o.id = p.order_id
           WHERE p.status = 'succeeded' AND o.status = 'pending_payment'`,
  },
  {
    id: 'refund_pending',
    description: 'Pagamento confirmado em pedido encerrado ainda sem reembolso',
    sql: `SELECT count(*)::int AS n FROM payments p JOIN orders o ON o.id = p.order_id
           WHERE p.status = 'succeeded' AND o.status IN ('cancelled', 'expired')`,
  },
  {
    id: 'stale_pending',
    description: 'Pedido aguardando pagamento com reserva vencida há mais de 1 hora (rotina parada?)',
    sql: `SELECT count(*)::int AS n FROM orders
           WHERE status = 'pending_payment' AND reserved_until < now() - interval '1 hour'
             AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = orders.id AND p.method = 'boleto' AND p.status = 'requires_action')`,
  },
  {
    id: 'canceled_payment_open_order',
    description: 'Pagamento cancelado com pedido ainda aguardando pagamento',
    sql: `SELECT count(*)::int AS n FROM payments p JOIN orders o ON o.id = p.order_id
           WHERE p.status = 'canceled' AND o.status = 'pending_payment'`,
  },
  {
    id: 'totals_mismatch',
    description: 'Subtotal ou quantidade do pedido diferente da soma dos itens',
    sql: `SELECT count(*)::int AS n FROM orders o
           WHERE o.subtotal_cents <> (SELECT coalesce(sum(line_total_cents), 0) FROM order_items i WHERE i.order_id = o.id)
              OR o.item_count <> (SELECT coalesce(sum(quantity), 0) FROM order_items i WHERE i.order_id = o.id)`,
  },
  {
    id: 'pending_without_reservation',
    description: 'Pedido aguardando pagamento sem prazo de reserva (nunca expiraria)',
    sql: `SELECT count(*)::int AS n FROM orders WHERE status = 'pending_payment' AND reserved_until IS NULL`,
  },
]

export async function runIntegrityChecks(db: Queryable): Promise<{ id: string; description: string; count: number }[]> {
  const results = []
  for (const check of INTEGRITY_CHECKS) {
    const { rows } = await db.query<{ n: number }>(check.sql)
    results.push({ id: check.id, description: check.description, count: rows[0]?.n ?? 0 })
  }
  return results
}
