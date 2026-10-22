import type { PaymentSession } from '@/lib/api/types'

/**
 * Resultado do painel de cartão. É só uma dica de UX: quem decide se o pedido foi pago é o
 * servidor, consultando o Stripe (`/payment/sync` ou webhook).
 */
export type PaymentSheetOutcome = { kind: 'completed' } | { kind: 'canceled' } | { kind: 'failed'; message: string }

export type CardPaymentSession = Extract<PaymentSession, { method: 'card' }>
