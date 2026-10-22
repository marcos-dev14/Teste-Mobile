import Stripe from 'stripe'

/**
 * Fronteira com o provedor de pagamento. O restante do código conhece só esta interface:
 * os testes usam um gateway falso e nenhum dado de cartão passa pela API (o app fala
 * direto com o Stripe pelo PaymentSheet). Pix e boleto são confirmados pelo servidor; o
 * CPF/CNPJ do pagador só atravessa a API a caminho do Stripe (não é gravado nem registrado).
 */

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

export type PaymentMethodKind = 'card' | 'pix' | 'boleto'

/** Dados para o cliente pagar o Pix (vêm de `next_action.pix_display_qr_code`). */
export interface PixInstructions {
  /** "Pix copia e cola". */
  qrCodeData: string
  qrCodeImageUrl: string
  hostedInstructionsUrl: string | null
  expiresAt: string
}

/** Dados do boleto (vêm de `next_action.boleto_display_details`). */
export interface BoletoInstructions {
  number: string
  pdfUrl: string | null
  hostedVoucherUrl: string | null
  expiresAt: string
}

export interface PaymentIntentSnapshot {
  id: string
  status: PaymentIntentStatus
  amountCents: number
  amountReceivedCents: number
  currency: string
  /** `metadata.order_id` gravado na criação: confere que o evento é deste pedido. */
  orderId: string | null
  clientSecret: string | null
  /** Código da última tentativa que falhou (cartão recusado, Pix/boleto expirado…). */
  failureCode: string | null
  pix: PixInstructions | null
  boleto: BoletoInstructions | null
}

/** Dados exigidos pelo Stripe para Pix e boleto. O endereço só é usado no boleto. */
export interface Payer {
  name: string
  email: string
  taxId: string
  address?: { line1: string; city: string; state: string; postalCode: string }
}

/** `eventType` é o tipo original do Stripe (ex.: `payment_intent.succeeded`). */
export type WebhookEvent = { id: string; eventType: string } & (
  | { type: 'payment_intent'; paymentIntent: PaymentIntentSnapshot }
  | { type: 'charge.refunded'; paymentIntentId: string; amountCents: number; amountRefundedCents: number }
  | { type: 'ignored' }
)

export interface PaymentGateway {
  readonly publishableKey: string
  createPaymentIntent(input: { orderId: string; amountCents: number; method: PaymentMethodKind }): Promise<PaymentIntentSnapshot>
  /**
   * Confirma Pix ou boleto no servidor (gera QR Code ou boleto). `pixExpiresAt` alinha o
   * vencimento do Pix à reserva do pedido; `boletoExpiresAfterDays` define o vencimento do boleto.
   * Lança `PayerDetailsRejected` quando o Stripe recusa os dados do pagador.
   */
  confirmAsyncPayment(
    id: string,
    input: { method: 'pix' | 'boleto'; payer: Payer; pixExpiresAt?: Date; boletoExpiresAfterDays?: number },
  ): Promise<PaymentIntentSnapshot>
  retrievePaymentIntent(id: string): Promise<PaymentIntentSnapshot>
  /** Lança `PaymentIntentNotCancelable` se o pagamento já foi concluído, está em processamento ou é boleto em aberto. */
  cancelPaymentIntent(id: string): Promise<PaymentIntentSnapshot>
  refundPaymentIntent(id: string, orderId: string): Promise<void>
  /** Lança `InvalidWebhookSignature` ou `WebhookNotConfigured`. */
  verifyWebhook(rawBody: Buffer, signature: string | undefined): WebhookEvent
}

/** Falha de comunicação com o provedor (rede, timeout, 5xx, chave inválida). */
export class PaymentProviderError extends Error {}
/** O PaymentIntent não está no estado exigido pela operação (ex.: confirmar algo já confirmado). */
export class PaymentIntentStateConflict extends Error {}
export class PaymentIntentNotCancelable extends PaymentIntentStateConflict {}
/** O Stripe recusou os dados do pagador (ex.: CPF inválido). `code` vem do Stripe, sem os dados. */
export class PayerDetailsRejected extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}
export class InvalidWebhookSignature extends Error {}
export class WebhookNotConfigured extends Error {}

const PAYMENT_INTENT_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_intent.requires_action',
])

const KNOWN_STATUSES = new Set<string>([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'requires_capture',
  'succeeded',
  'canceled',
])

const isoFromUnix = (seconds: number | null | undefined) => new Date((seconds ?? 0) * 1000).toISOString()

function pixInstructions(intent: Stripe.PaymentIntent): PixInstructions | null {
  const details = intent.next_action?.pix_display_qr_code
  if (!details?.data || !details.image_url_png) return null
  return {
    qrCodeData: details.data,
    qrCodeImageUrl: details.image_url_png,
    hostedInstructionsUrl: details.hosted_instructions_url ?? null,
    expiresAt: isoFromUnix(details.expires_at),
  }
}

function boletoInstructions(intent: Stripe.PaymentIntent): BoletoInstructions | null {
  const details = intent.next_action?.boleto_display_details
  if (!details?.number) return null
  return {
    number: details.number,
    pdfUrl: details.pdf ?? null,
    hostedVoucherUrl: details.hosted_voucher_url ?? null,
    expiresAt: isoFromUnix(details.expires_at),
  }
}

function snapshot(intent: Stripe.PaymentIntent): PaymentIntentSnapshot {
  if (!KNOWN_STATUSES.has(intent.status)) throw new PaymentProviderError(`status desconhecido: ${intent.status}`)
  return {
    id: intent.id,
    status: intent.status as PaymentIntentStatus,
    amountCents: intent.amount,
    amountReceivedCents: intent.amount_received,
    currency: intent.currency,
    orderId: typeof intent.metadata?.order_id === 'string' ? intent.metadata.order_id : null,
    clientSecret: intent.client_secret,
    failureCode: intent.last_payment_error?.code ?? intent.last_payment_error?.decline_code ?? null,
    pix: pixInstructions(intent),
    boleto: boletoInstructions(intent),
  }
}

/** Mensagens do provedor podem ecoar o valor enviado: CPF/CNPJ e e-mail nunca vão para o log. */
export function scrubProviderMessage(message: string): string {
  return message
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\d[\d./-]{9,}\d/g, '[documento]')
    .slice(0, 200)
}

/** Converte erros do SDK sem levar mensagens do provedor (que podem conter ids ou dados) para a resposta. */
async function call<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Erros do próprio domínio, já classificados por quem chamou, seguem intactos.
    if (error instanceof PaymentIntentStateConflict || error instanceof PayerDetailsRejected) throw error
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'payment_intent_unexpected_state') throw new PaymentIntentStateConflict(scrubProviderMessage(error.message))
      // Erro de validação apontando para dados do pagador: é entrada do cliente, não indisponibilidade.
      if (error.type === 'StripeInvalidRequestError' && /tax_id|billing_details|email|address/.test(error.param ?? '')) {
        throw new PayerDetailsRejected(error.code ?? 'invalid_payer_details')
      }
      // Só para o log do servidor (ajuda o diagnóstico); a resposta ao app é genérica.
      throw new PaymentProviderError(`${error.type}${error.code ? `/${error.code}` : ''}: ${scrubProviderMessage(error.message)}`)
    }
    throw new PaymentProviderError(error instanceof Error ? error.message : 'erro desconhecido')
  }
}

export function createStripeGateway(options: {
  secretKey: string
  publishableKey: string
  webhookSecret?: string
}): PaymentGateway {
  // Defesa em profundidade além da validação do env: este código nunca opera em modo live.
  if (!/^(sk|rk)_test_/.test(options.secretKey) || !options.publishableKey.startsWith('pk_test_')) {
    throw new Error('Somente chaves de TESTE do Stripe são aceitas.')
  }
  const stripe = new Stripe(options.secretKey, { maxNetworkRetries: 2, timeout: 10_000 })

  return {
    publishableKey: options.publishableKey,

    createPaymentIntent: ({ orderId, amountCents, method }) =>
      call(async () =>
        snapshot(
          await stripe.paymentIntents.create(
            {
              amount: amountCents,
              currency: 'brl',
              // Um método por pedido, escolhido no checkout (e só ele é aceito pelo Stripe).
              allowed_payment_method_types: [method],
              // Minimização: só o id do pedido (concilia o evento); nada que identifique a pessoa.
              metadata: { order_id: orderId },
            },
            // Retentativas (rede, pedido reenviado) devolvem o mesmo PaymentIntent.
            { idempotencyKey: `order:${orderId}:payment-intent` },
          ),
        ),
      ),

    confirmAsyncPayment: (id, { method, payer, pixExpiresAt, boletoExpiresAfterDays }) =>
      call(async () => {
        const billing: Stripe.PaymentIntentConfirmParams.PaymentMethodData.BillingDetails = {
          name: payer.name,
          email: payer.email,
        }
        if (method === 'boleto' && payer.address) {
          billing.address = {
            line1: payer.address.line1,
            city: payer.address.city,
            state: payer.address.state,
            postal_code: payer.address.postalCode,
            country: 'BR',
          }
        }
        const intent = await stripe.paymentIntents.confirm(id, {
          payment_method_data:
            method === 'pix'
              ? { type: 'pix', billing_details: { ...billing, tax_id: payer.taxId } }
              : { type: 'boleto', boleto: { tax_id: payer.taxId }, billing_details: billing },
          payment_method_options:
            method === 'pix'
              ? { pix: pixExpiresAt ? { expires_at: Math.floor(pixExpiresAt.getTime() / 1000) } : {} }
              : { boleto: boletoExpiresAfterDays !== undefined ? { expires_after_days: boletoExpiresAfterDays } : {} },
        })
        return snapshot(intent)
      }),

    retrievePaymentIntent: (id) => call(async () => snapshot(await stripe.paymentIntents.retrieve(id))),

    cancelPaymentIntent: (id) =>
      call(async () => {
        try {
          return snapshot(await stripe.paymentIntents.cancel(id))
        } catch (error) {
          // Recusa por estado (boleto em aberto, Pix mudando de estado, já pago…) às vezes vem sem
          // código. Não é indisponibilidade: quem chama relê o PaymentIntent e segue o estado real.
          if (error instanceof Stripe.errors.StripeInvalidRequestError) throw new PaymentIntentNotCancelable(error.message)
          throw error
        }
      }),

    refundPaymentIntent: (id, orderId) =>
      call(async () => {
        await stripe.refunds.create({ payment_intent: id }, { idempotencyKey: `order:${orderId}:refund` })
      }),

    verifyWebhook: (rawBody, signature) => {
      if (!options.webhookSecret) throw new WebhookNotConfigured()
      if (!signature) throw new InvalidWebhookSignature('sem assinatura')
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, options.webhookSecret)
      } catch (error) {
        throw new InvalidWebhookSignature(error instanceof Error ? error.message : 'assinatura inválida')
      }
      // Defesa em profundidade: este sistema opera só em modo de teste; evento live é ignorado.
      if (event.livemode) return { id: event.id, eventType: event.type, type: 'ignored' }
      if (PAYMENT_INTENT_EVENTS.has(event.type)) {
        return {
          id: event.id,
          eventType: event.type,
          type: 'payment_intent',
          paymentIntent: snapshot(event.data.object as Stripe.PaymentIntent),
        }
      }
      if (event.type === 'charge.refunded') {
        const charge = event.data.object
        const intent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (intent) {
          return {
            id: event.id,
            eventType: event.type,
            type: 'charge.refunded',
            paymentIntentId: intent,
            amountCents: charge.amount,
            amountRefundedCents: charge.amount_refunded,
          }
        }
      }
      return { id: event.id, eventType: event.type, type: 'ignored' }
    },
  }
}
