import type { FastifyBaseLogger } from 'fastify'

import type { Pool, Queryable } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { AppError, badRequest, conflict, notFound } from '../../lib/errors.js'
import { normalizeTaxId } from '../../lib/tax-id.js'
import {
  InvalidWebhookSignature,
  PayerDetailsRejected,
  PaymentIntentNotCancelable,
  PaymentIntentStateConflict,
  PaymentProviderError,
  WebhookNotConfigured,
  type BoletoInstructions,
  type PaymentGateway,
  type PaymentIntentSnapshot,
  type PaymentIntentStatus,
  type PaymentMethodKind,
  type PixInstructions,
  type WebhookEvent,
} from './gateway.js'
import * as repo from './repository.js'

/**
 * Máquina de estados do pagamento. Regras (docs/audit/checkout-stripe.md):
 * - `paid` só a partir do PaymentIntent lido do Stripe pelo servidor (webhook assinado ou
 *   reconciliação), nunca pela resposta do app;
 * - estados terminais (`succeeded`, `canceled`) são definitivos: evento atrasado não regride;
 * - valor, moeda e pedido do PaymentIntent precisam bater com o registrado;
 * - pagamento confirmado de um pedido já cancelado/expirado é reembolsado;
 * - boleto emitido não pode ser cancelado antes de vencer (limitação do Stripe); vencido sem
 *   pagamento, o pedido expira e o estoque volta.
 */

const TERMINAL = new Set<PaymentIntentStatus>(['succeeded', 'canceled'])

/** Intervalo até reavaliar um pedido vencido que ainda não pôde ser encerrado. */
const RECHECK_MINUTES = 15

/** Método do pedido → tipo de pagamento no Stripe. */
const KIND: Record<repo.PayableOrder['paymentMethod'], PaymentMethodKind> = {
  credit_card: 'card',
  pix: 'pix',
  boleto: 'boleto',
}

/** O Stripe exige que o Pix vença ao menos 60 s após a confirmação; deixamos margem. */
const MIN_PIX_LIFETIME_MS = 120_000

const providerUnavailable = () =>
  new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Não foi possível falar com o serviço de pagamento. Tente novamente.')

/** O que o app precisa para cada método. Nunca inclui chave secreta nem dados do pagador. */
export type PaymentSession = { paymentIntentId: string; amountCents: number; currency: string } & (
  | { method: 'card'; clientSecret: string; publishableKey: string }
  | { method: 'pix'; pix: PixInstructions }
  | { method: 'boleto'; boleto: BoletoInstructions }
)

type Outcome = { refundOrderId: string } | { expireOrderId: string }
type FinalStatus = 'cancelled' | 'expired'

export interface PaymentsServiceDeps {
  pool: Pool
  gateway: PaymentGateway
  log: FastifyBaseLogger
  boletoExpiresAfterDays: number
  /** Aceita os CPF/CNPJ de teste do Stripe (nunca em produção). */
  allowTestTaxIds: boolean
}

export function createPaymentsService({ pool, gateway, log, boletoExpiresAfterDays, allowTestTaxIds }: PaymentsServiceDeps) {
  async function provider<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        log.error({ reason: error.message }, 'payment provider call failed')
        throw providerUnavailable()
      }
      throw error
    }
  }

  /** Aplica o estado do PaymentIntent ao pagamento e ao pedido. Retorna uma ação a executar fora da transação. */
  async function applyIntent(
    tx: Queryable,
    intent: PaymentIntentSnapshot,
    canceledStatus: FinalStatus = 'cancelled',
  ): Promise<Outcome | null> {
    const found = await repo.findPaymentByIntent(tx, intent.id)
    if (!found) {
      log.warn({ paymentIntentId: intent.id }, 'payment intent without local payment; ignored')
      return null
    }
    // Ordem de travas fixa em todos os caminhos: pedido, depois pagamento.
    const order = await repo.lockOrder(tx, found.orderId)
    const payment = (await repo.lockPaymentByIntent(tx, intent.id))!
    if (!order) return null

    const mismatch =
      intent.orderId !== payment.orderId || intent.currency !== payment.currency || intent.amountCents !== payment.amountCents
    if (mismatch) {
      log.error({ paymentIntentId: intent.id, orderId: payment.orderId }, 'payment intent does not match order; ignored')
      return null
    }
    if (TERMINAL.has(payment.status)) return null
    if (payment.status === intent.status && payment.failureCode === intent.failureCode) return null

    if (intent.status === 'succeeded' && intent.amountReceivedCents !== payment.amountCents) {
      log.error({ paymentIntentId: intent.id, orderId: order.id }, 'amount received differs from order total; ignored')
      return null
    }
    await repo.setPaymentState(tx, payment.id, { status: intent.status, failureCode: intent.failureCode })

    if (intent.status === 'succeeded') {
      if (order.status === 'pending_payment') await repo.setOrderStatus(tx, order.id, 'paid')
      else if (order.status === 'cancelled' || order.status === 'expired') {
        log.warn({ orderId: order.id }, 'payment succeeded for closed order; refunding')
        return { refundOrderId: order.id }
      }
    } else if (intent.status === 'canceled' && order.status === 'pending_payment') {
      await repo.setOrderStatus(tx, order.id, canceledStatus)
      await repo.restockOrder(tx, order.id)
    } else if (
      payment.method === 'boleto' &&
      intent.status === 'requires_payment_method' &&
      intent.failureCode &&
      order.status === 'pending_payment'
    ) {
      // Boleto vencido sem pagamento (o Stripe avisa 1 dia útil após o vencimento): não há como pagá-lo.
      return { expireOrderId: order.id }
    }
    return null
  }

  /**
   * Reembolsa e marca o pedido. Se falhar, nada se perde: o par "pagamento succeeded + pedido
   * encerrado" continua no banco e `retryRefunds` tenta de novo. A chave de idempotência do
   * Stripe (por pedido) impede reembolso em dobro em qualquer repetição.
   */
  async function refund(orderId: string, paymentIntentId: string): Promise<boolean> {
    try {
      await gateway.refundPaymentIntent(paymentIntentId, orderId)
      await withTransaction(pool, async (tx) => {
        const order = await repo.lockOrder(tx, orderId)
        if (order?.status === 'cancelled' || order?.status === 'expired') await repo.setOrderStatus(tx, orderId, 'refunded')
      })
      return true
    } catch (error) {
      log.error({ orderId, reason: error instanceof Error ? error.message : 'unknown' }, 'automatic refund failed; will retry')
      return false
    }
  }

  async function runOutcome(outcome: Outcome | null, paymentIntentId: string): Promise<void> {
    if (!outcome) return
    if ('refundOrderId' in outcome) await refund(outcome.refundOrderId, paymentIntentId)
    else await cancelPending(outcome.expireOrderId, 'expired')
  }

  /** Aplica o estado lido do Stripe (reconciliação: não depende do webhook). */
  async function reconcile(intent: PaymentIntentSnapshot, canceledStatus?: FinalStatus): Promise<void> {
    await runOutcome(await withTransaction(pool, (tx) => applyIntent(tx, intent, canceledStatus)), intent.id)
  }

  /**
   * Encerra um pedido aguardando pagamento, cancelando o PaymentIntent antes para não cobrar um
   * pedido encerrado. Retorna false se o pagamento não pode ser cancelado (pago, em processamento
   * ou boleto em aberto) — nesse caso o pedido segue o estado real do Stripe.
   */
  async function cancelPending(orderId: string, finalStatus: FinalStatus): Promise<boolean> {
    const payment = await repo.findPaymentByOrder(pool, orderId)
    if (payment) {
      let intent = await gateway.retrievePaymentIntent(payment.paymentIntentId)
      const openBoleto = payment.method === 'boleto' && intent.status === 'requires_action'
      if (intent.status === 'succeeded' || intent.status === 'processing' || openBoleto) {
        await reconcile(intent)
        return false
      }
      if (intent.status !== 'canceled') {
        try {
          intent = await gateway.cancelPaymentIntent(payment.paymentIntentId)
        } catch (error) {
          if (!(error instanceof PaymentIntentNotCancelable)) throw error
          intent = await gateway.retrievePaymentIntent(payment.paymentIntentId)
          await reconcile(intent)
          if (intent.status !== 'canceled') return false
        }
      }
      await reconcile(intent, finalStatus)
    }
    return withTransaction(pool, async (tx) => {
      const order = await repo.lockOrder(tx, orderId)
      if (order?.status !== 'pending_payment') return true
      // Um pagamento iniciado depois da nossa primeira leitura (corrida com `start`) ainda não foi
      // cancelado no Stripe: não fecha o pedido agora; a próxima execução trata pelo pagamento.
      if (!payment && (await repo.findPaymentByOrder(tx, orderId))) return false
      await repo.setOrderStatus(tx, orderId, finalStatus)
      await repo.restockOrder(tx, orderId)
      return true
    })
  }

  async function ownOrder(userId: string, orderId: string) {
    const order = await repo.findOrderForUser(pool, userId, orderId)
    if (!order) throw notFound('Pedido não encontrado.', 'ORDER_NOT_FOUND')
    return order
  }

  /** Gera (ou gera de novo, após expirar/falhar) o QR Code do Pix ou o boleto. */
  async function confirmAsync(
    order: repo.PayableOrder,
    intent: PaymentIntentSnapshot,
    method: 'pix' | 'boleto',
    taxIdInput: string | undefined,
  ): Promise<PaymentIntentSnapshot> {
    if (!taxIdInput) throw new AppError(422, 'TAX_ID_REQUIRED', 'Informe o CPF ou CNPJ de quem vai pagar.')
    const taxId = normalizeTaxId(taxIdInput, { allowTestIds: allowTestTaxIds })
    if (!taxId) throw new AppError(422, 'INVALID_TAX_ID', 'CPF ou CNPJ inválido.')

    const payer = await repo.findPayer(pool, order.id)
    if (!payer) throw notFound('Pedido não encontrado.', 'ORDER_NOT_FOUND')
    const pixExpiresAt = order.reservedUntil ?? undefined
    if (method === 'pix' && (!pixExpiresAt || pixExpiresAt.getTime() - Date.now() < MIN_PIX_LIFETIME_MS)) {
      throw conflict('ORDER_EXPIRED', 'O prazo para pagar este pedido terminou.')
    }
    const address = payer.shippingAddress
    try {
      return await provider(() =>
        gateway.confirmAsyncPayment(intent.id, {
          method,
          payer: {
            name: payer.name,
            email: payer.email,
            taxId,
            address: {
              line1: address.number ? `${address.addressLine1}, ${address.number}` : address.addressLine1,
              city: address.city,
              state: address.state,
              postalCode: address.zipCode,
            },
          },
          // O Pix vence junto com a reserva do estoque: não existe Pix válido para pedido expirado.
          pixExpiresAt: method === 'pix' ? pixExpiresAt : undefined,
          boletoExpiresAfterDays: method === 'boleto' ? boletoExpiresAfterDays : undefined,
        }),
      )
    } catch (error) {
      if (error instanceof PayerDetailsRejected) {
        log.info({ orderId: order.id, code: error.code }, 'payer details rejected by provider')
        throw new AppError(422, 'PAYER_DETAILS_REJECTED', 'O serviço de pagamento recusou os dados do pagador. Confira o CPF/CNPJ.')
      }
      throw error
    }
  }

  return {
    /**
     * Cria (ou recupera) o pagamento do pedido. Cartão: dados para o PaymentSheet. Pix/boleto:
     * instruções de pagamento (QR Code ou boleto), gerando-as com o CPF/CNPJ quando necessário.
     */
    async start(userId: string, orderId: string, input: { taxId?: string } = {}): Promise<PaymentSession> {
      const order = await ownOrder(userId, orderId)
      if (order.status !== 'pending_payment') throw conflict('ORDER_NOT_PAYABLE', 'Este pedido não está aguardando pagamento.')
      if (!order.reservationActive) throw conflict('ORDER_EXPIRED', 'O prazo para pagar este pedido terminou.')

      const method = KIND[order.paymentMethod]
      const existing = await repo.findPaymentByOrder(pool, orderId)
      let intent = await provider(() =>
        existing
          ? gateway.retrievePaymentIntent(existing.paymentIntentId)
          : gateway.createPaymentIntent({ orderId, amountCents: order.totalCents, method }),
      )
      if (!existing) {
        // Grava o pagamento sob a trava do pedido e só se ele ainda aguarda pagamento: um cancelamento
        // ou expiração concorrente não pode deixar um client secret válido para um pedido fechado.
        // Concorrência entre inícios: a idempotência do Stripe garante o mesmo PaymentIntent.
        const stillPending = await withTransaction(pool, async (tx) => {
          const locked = await repo.lockOrder(tx, orderId)
          if (locked?.status !== 'pending_payment') return false
          await repo.insertPayment(tx, {
            orderId,
            paymentIntentId: intent.id,
            method,
            status: intent.status,
            amountCents: intent.amountCents,
            currency: intent.currency,
          })
          return true
        })
        if (!stillPending) throw conflict('ORDER_NOT_PAYABLE', 'Este pedido não está aguardando pagamento.')
      }
      const notPayable = () => conflict('ORDER_NOT_PAYABLE', 'Este pedido não está aguardando pagamento.')
      if (TERMINAL.has(intent.status)) {
        await reconcile(intent)
        throw notPayable()
      }
      const base = { paymentIntentId: intent.id, amountCents: intent.amountCents, currency: intent.currency }

      if (method === 'card') {
        if (!intent.clientSecret) throw providerUnavailable()
        return { ...base, method, clientSecret: intent.clientSecret, publishableKey: gateway.publishableKey }
      }
      if (intent.status === 'processing') {
        throw conflict('PAYMENT_PROCESSING', 'O pagamento está sendo processado. Aguarde a confirmação.')
      }
      // Instruções ainda válidas (Pix/boleto já gerado): devolve sem pedir o CPF de novo.
      const current = method === 'pix' ? intent.pix : intent.boleto
      if (intent.status !== 'requires_action' || !current) {
        try {
          intent = await confirmAsync(order, intent, method, input.taxId)
        } catch (error) {
          if (!(error instanceof PaymentIntentStateConflict)) throw error
          // Outra requisição (outro aparelho, toque duplo) confirmou no mesmo instante: vale o estado atual.
          intent = await provider(() => gateway.retrievePaymentIntent(intent.id))
        }
        await reconcile(intent)
        if (TERMINAL.has(intent.status)) throw notPayable()
        if (intent.status === 'processing') {
          throw conflict('PAYMENT_PROCESSING', 'O pagamento está sendo processado. Aguarde a confirmação.')
        }
      }
      if (method === 'pix' && intent.pix) return { ...base, method, pix: intent.pix }
      if (method === 'boleto' && intent.boleto) return { ...base, method, boleto: intent.boleto }
      throw providerUnavailable()
    },

    /** O servidor confere o estado no Stripe (após o PaymentSheet e enquanto Pix/boleto aguardam). */
    async sync(userId: string, orderId: string): Promise<void> {
      await ownOrder(userId, orderId)
      const payment = await repo.findPaymentByOrder(pool, orderId)
      if (!payment) return
      await reconcile(await provider(() => gateway.retrievePaymentIntent(payment.paymentIntentId)))
    },

    async cancel(userId: string, orderId: string): Promise<void> {
      const order = await ownOrder(userId, orderId)
      if (order.status !== 'pending_payment') {
        throw conflict('ORDER_NOT_CANCELLABLE', 'Só é possível cancelar pedidos que aguardam pagamento.')
      }
      const cancelled = await provider(() => cancelPending(orderId, 'cancelled'))
      const after = await ownOrder(userId, orderId)
      if (after.status === 'paid') throw conflict('ORDER_ALREADY_PAID', 'O pagamento deste pedido já foi aprovado.')
      if (!cancelled && after.status === 'pending_payment') {
        throw conflict(
          'ORDER_NOT_CANCELLABLE',
          order.paymentMethod === 'boleto'
            ? 'Boleto emitido não pode ser cancelado. Se não for pago até o vencimento, o pedido é cancelado automaticamente.'
            : 'O pagamento está mudando de situação e não pôde ser cancelado agora. Tente novamente em instantes.',
        )
      }
    },

    async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
      let event: WebhookEvent
      try {
        event = gateway.verifyWebhook(rawBody, signature)
      } catch (error) {
        if (error instanceof WebhookNotConfigured) {
          throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Webhook não configurado.')
        }
        if (error instanceof InvalidWebhookSignature) {
          log.warn('stripe webhook with invalid signature')
          throw badRequest('INVALID_SIGNATURE', 'Assinatura inválida.')
        }
        throw error
      }

      // Registro do evento e efeito na mesma transação: falha no meio permite o reenvio do Stripe.
      const outcome = await withTransaction(pool, async (tx) => {
        if (!(await repo.recordEvent(tx, event.id, event.eventType))) return null
        if (event.type === 'payment_intent') {
          const result = await applyIntent(tx, event.paymentIntent)
          return result ? { result, paymentIntentId: event.paymentIntent.id } : null
        }
        if (event.type === 'charge.refunded' && event.amountRefundedCents >= event.amountCents) {
          const payment = await repo.findPaymentByIntent(tx, event.paymentIntentId)
          const order = payment ? await repo.lockOrder(tx, payment.orderId) : null
          if (order?.status === 'paid') {
            await repo.setOrderStatus(tx, order.id, 'refunded')
            await repo.restockOrder(tx, order.id)
          } else if (order?.status === 'cancelled' || order?.status === 'expired') {
            await repo.setOrderStatus(tx, order.id, 'refunded')
          }
        }
        return null
      })
      if (outcome) await runOutcome(outcome.result, outcome.paymentIntentId)
    },

    /**
     * Encerra como "expirado" os pedidos cuja reserva venceu. Os que ainda não podem ser encerrados
     * (boleto em aberto, pagamento em processamento) ou cuja tentativa falhou voltam à fila só depois
     * de `RECHECK_MINUTES`, para não ocuparem o lote a cada execução.
     */
    async expireStale(limit = 50): Promise<number> {
      let expired = 0
      for (const orderId of await repo.listExpiredPendingOrders(pool, limit)) {
        try {
          if (await cancelPending(orderId, 'expired')) expired += 1
          else await repo.postponeExpirationCheck(pool, orderId, RECHECK_MINUTES)
        } catch (error) {
          log.error({ orderId, reason: error instanceof Error ? error.message : 'unknown' }, 'order expiration failed')
          await repo.postponeExpirationCheck(pool, orderId, RECHECK_MINUTES)
        }
      }
      return expired
    },

    /** Tenta de novo os reembolsos devidos que falharam (pagamento que chegou após o encerramento). */
    async retryRefunds(limit = 20): Promise<number> {
      let refunded = 0
      for (const pending of await repo.listPendingRefunds(pool, limit)) {
        if (await refund(pending.orderId, pending.paymentIntentId)) refunded += 1
      }
      return refunded
    },
  }
}

export type PaymentsService = ReturnType<typeof createPaymentsService>
