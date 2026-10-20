import type { Pool } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { conflict, notFound } from '../../lib/errors.js'
import { offsetFor } from '../../lib/schemas.js'
import { fingerprint } from '../../lib/tokens.js'
import { findAddressForUser } from '../addresses/repository.js'
import { aggregateItems, buildQuote, loadColorsForPricing } from './pricing.js'
import * as repo from './repository.js'
import type { CreateOrderBody, OrderDetailDto } from './schemas.js'

/** Sinaliza, dentro da transação, que outra requisição com a mesma chave venceu a corrida. */
class IdempotencyRace extends Error {}

const idempotencyMismatch = () =>
  conflict(
    'IDEMPOTENCY_KEY_REUSED',
    'Esta chave de idempotência já foi usada com outro conteúdo. Gere uma nova chave.',
  )

export function createOrdersService({ pool }: { pool: Pool }) {
  async function replay(userId: string, key: string, requestFingerprint: string) {
    const existing = await repo.findOrderByIdempotencyKey(pool, userId, key)
    if (!existing) return null
    if (existing.fingerprint !== requestFingerprint) throw idempotencyMismatch()
    return existing.order
  }

  return {
    /**
     * Cria o pedido numa única transação: valida o endereço do próprio usuário, trava as cores,
     * recalcula preços e estoque no servidor, decrementa o estoque e grava o snapshot.
     * Retorna `created: false` quando a mesma chave de idempotência já gerou um pedido.
     */
    async create(
      userId: string,
      idempotencyKey: string,
      input: CreateOrderBody,
    ): Promise<{ order: OrderDetailDto; created: boolean }> {
      const items = aggregateItems(input.items)
      const requestFingerprint = fingerprint({
        addressId: input.addressId,
        paymentMethod: input.paymentMethod,
        items: [...items].sort((a, b) => a.colorId.localeCompare(b.colorId)),
      })

      const previous = await replay(userId, idempotencyKey, requestFingerprint)
      if (previous) return { order: previous, created: false }

      try {
        const order = await withTransaction(pool, async (tx) => {
          const address = await findAddressForUser(tx, userId, input.addressId)
          if (!address) throw notFound('Endereço não encontrado.', 'ADDRESS_NOT_FOUND')

          const rows = await loadColorsForPricing(
            tx,
            items.map((item) => item.colorId),
            { forUpdate: true },
          )
          const quote = buildQuote(items, rows)

          if (quote.unavailable.length > 0) {
            throw conflict(
              'ITEM_UNAVAILABLE',
              'Alguns itens não estão mais disponíveis.',
              quote.unavailable.map((item) => ({ message: 'Item indisponível.', ...item })),
            )
          }
          const short = quote.lines.filter((line) => line.status !== 'ok')
          if (short.length > 0) {
            throw conflict(
              'INSUFFICIENT_STOCK',
              'Estoque insuficiente para alguns itens.',
              short.map((line) => ({
                message: `Disponível: ${line.availableStock}.`,
                colorId: line.colorId,
                requested: line.quantity,
                available: line.availableStock,
              })),
            )
          }

          for (const line of quote.lines) {
            // Com as linhas travadas isto não deve falhar; se falhar, aborta a transação inteira.
            if (!(await repo.decrementStock(tx, line.colorId, line.quantity))) {
              throw conflict('INSUFFICIENT_STOCK', 'Estoque insuficiente para alguns itens.')
            }
          }

          const orderId = await repo.insertOrder(
            tx,
            {
              userId,
              addressId: address.id,
              paymentMethod: input.paymentMethod,
              itemCount: quote.itemCount,
              subtotalCents: quote.subtotalCents,
              shippingCents: quote.shippingCents,
              totalCents: quote.totalCents,
              shippingAddress: {
                fullName: address.fullName,
                addressLine1: address.addressLine1,
                number: address.number,
                addressLine2: address.addressLine2,
                neighborhood: address.neighborhood,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
                country: address.country,
              },
              idempotencyKey,
              requestFingerprint,
            },
            quote.lines,
          )
          // Rollback desfaz o decremento de estoque desta tentativa.
          if (!orderId) throw new IdempotencyRace()
          return (await repo.findOrderForUser(tx, userId, orderId))!
        })
        return { order, created: true }
      } catch (error) {
        if (!(error instanceof IdempotencyRace)) throw error
        const winner = await replay(userId, idempotencyKey, requestFingerprint)
        if (!winner) throw error
        return { order: winner, created: false }
      }
    },

    async list(userId: string, page: number, pageSize: number) {
      const { items, total } = await repo.listOrdersForUser(pool, userId, pageSize, offsetFor(page, pageSize))
      return { data: items, page, pageSize, total }
    },

    async get(userId: string, orderId: string): Promise<OrderDetailDto> {
      const order = await repo.findOrderForUser(pool, userId, orderId)
      if (!order) throw notFound('Pedido não encontrado.', 'ORDER_NOT_FOUND')
      return order
    },
  }
}

export type OrdersService = ReturnType<typeof createOrdersService>
