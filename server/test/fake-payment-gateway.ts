import Stripe from 'stripe'

import {
  createStripeGateway,
  PayerDetailsRejected,
  PaymentIntentNotCancelable,
  PaymentIntentStateConflict,
  PaymentProviderError,
  type PaymentGateway,
  type PaymentIntentSnapshot,
  type PaymentIntentStatus,
  type PaymentMethodKind,
  type Payer,
} from '../src/modules/payments/gateway.js'

/** Segredo de webhook só para testes: os eventos são assinados localmente, sem rede. */
export const TEST_WEBHOOK_SECRET = 'whsec_testsecretonlyforintegrationtests'

const signer = new Stripe('sk_test_signeronly')

/** Corpo e headers de um webhook assinado como o Stripe assinaria. */
export function signedWebhook(
  event: { id: string; type: string; object: Record<string, unknown>; livemode?: boolean },
  secret = TEST_WEBHOOK_SECRET,
) {
  const payload = JSON.stringify({
    id: event.id,
    object: 'event',
    type: event.type,
    api_version: Stripe.API_VERSION,
    created: Math.floor(Date.now() / 1000),
    livemode: event.livemode ?? false,
    data: { object: event.object },
  })
  const signature = signer.webhooks.generateTestHeaderString({ payload, secret })
  return { payload, headers: { 'content-type': 'application/json', 'stripe-signature': signature } }
}

/** Objeto `payment_intent` como o Stripe envia no webhook. */
export function intentObject(intent: PaymentIntentSnapshot, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: intent.id,
    object: 'payment_intent',
    amount: intent.amountCents,
    amount_received: intent.amountReceivedCents,
    currency: intent.currency,
    status: intent.status,
    client_secret: intent.clientSecret,
    metadata: intent.orderId ? { order_id: intent.orderId } : {},
    ...overrides,
  }
}

/**
 * Stripe em memória com o mesmo contrato do adaptador real: idempotência por pedido,
 * cancelamento recusado para pagamento concluído e falhas sob demanda.
 */
export function createFakePaymentGateway() {
  const verifier = createStripeGateway({
    secretKey: 'sk_test_fakeverifier',
    publishableKey: 'pk_test_fakeverifier',
    webhookSecret: TEST_WEBHOOK_SECRET,
  })
  const intents = new Map<string, PaymentIntentSnapshot & { method: PaymentMethodKind }>()
  /** Último pagador/opções enviados na confirmação (para conferir o que sai da API). */
  const confirmations: { id: string; payer: Payer; pixExpiresAt?: Date; boletoExpiresAfterDays?: number }[] = []
  let rejectNextPayer = false
  let cancelRefusals = 0
  let createGate: Promise<void> | null = null
  let conflictNextConfirm = false
  const byOrder = new Map<string, string>()
  const refunds: string[] = []
  let sequence = 0
  let failures = 0

  const maybeFail = () => {
    if (failures > 0) {
      failures -= 1
      throw new PaymentProviderError('api_connection_error')
    }
  }
  const copy = (id: string): PaymentIntentSnapshot => {
    // O método fica só no estado interno do fake: o snapshot real não o expõe.
    const intent: Partial<PaymentIntentSnapshot & { method: PaymentMethodKind }> = { ...intents.get(id)! }
    delete intent.method
    return intent as PaymentIntentSnapshot
  }

  const gateway: PaymentGateway = {
    publishableKey: 'pk_test_fakepublishable',

    async createPaymentIntent({ orderId, amountCents, method }) {
      maybeFail()
      // Simula latência do Stripe: a criação só termina quando o teste liberar.
      if (createGate) await createGate
      const existing = byOrder.get(orderId)
      if (existing) return copy(existing)
      sequence += 1
      const id = `pi_fake_${sequence}`
      intents.set(id, {
        id,
        status: 'requires_payment_method',
        amountCents,
        amountReceivedCents: 0,
        currency: 'brl',
        orderId,
        clientSecret: `${id}_secret_fake`,
        failureCode: null,
        pix: null,
        boleto: null,
        method,
      })
      byOrder.set(orderId, id)
      return copy(id)
    },

    async confirmAsyncPayment(id, { method, payer, pixExpiresAt, boletoExpiresAfterDays }) {
      maybeFail()
      if (rejectNextPayer) {
        rejectNextPayer = false
      cancelRefusals = 0
      createGate = null
      conflictNextConfirm = false
        throw new PayerDetailsRejected('invalid_tax_id')
      }
      if (conflictNextConfirm) {
        // A outra requisição confirmou primeiro: o PI já tem instruções; esta recebe o erro de estado.
        conflictNextConfirm = false
        await gateway.confirmAsyncPayment(id, { method, payer, pixExpiresAt, boletoExpiresAfterDays })
        throw new PaymentIntentStateConflict('payment_intent_unexpected_state')
      }
      const intent = intents.get(id)!
      if (intent.method !== method || (intent.status !== 'requires_payment_method' && intent.status !== 'requires_confirmation')) {
        throw new PaymentIntentStateConflict('payment_intent_unexpected_state')
      }
      confirmations.push({ id, payer, pixExpiresAt, boletoExpiresAfterDays })
      sequence += 1
      intent.status = 'requires_action'
      if (method === 'pix') {
        intent.pix = {
          qrCodeData: `00020101pix-fake-${sequence}`,
          qrCodeImageUrl: `https://qr.example.test/${sequence}.png`,
          hostedInstructionsUrl: `https://payments.example.test/qr/${sequence}`,
          expiresAt: (pixExpiresAt ?? new Date(Date.now() + 4 * 3600_000)).toISOString(),
        }
      } else {
        intent.boleto = {
          number: `0101010101${sequence}`,
          pdfUrl: `https://payments.example.test/boleto/${sequence}.pdf`,
          hostedVoucherUrl: `https://payments.example.test/boleto/${sequence}`,
          expiresAt: new Date(Date.now() + (boletoExpiresAfterDays ?? 3) * 86_400_000).toISOString(),
        }
      }
      return copy(id)
    },

    async retrievePaymentIntent(id) {
      maybeFail()
      return copy(id)
    },

    async cancelPaymentIntent(id) {
      maybeFail()
      const intent = intents.get(id)!
      // Como no Stripe real: boleto em aberto não pode ser cancelado (o adaptador mapeia a recusa).
      if (intent.method === 'boleto' && intent.status === 'requires_action') {
        throw new PaymentIntentNotCancelable('boleto em aberto')
      }
      if (cancelRefusals > 0) {
        cancelRefusals -= 1
        throw new PaymentIntentNotCancelable('estado mudando no provedor')
      }
      if (intent.status === 'succeeded' || intent.status === 'processing' || intent.status === 'canceled') {
        throw new PaymentIntentNotCancelable('payment_intent_unexpected_state')
      }
      intent.status = 'canceled'
      intent.pix = null
      return copy(id)
    },

    async refundPaymentIntent(id) {
      maybeFail()
      refunds.push(id)
    },

    verifyWebhook: (rawBody, signature) => verifier.verifyWebhook(rawBody, signature),
  }

  return {
    gateway,
    refunds,
    confirmations,
    intentForOrder: (orderId: string) => {
      const id = byOrder.get(orderId)
      return id ? copy(id) : undefined
    },
    /** Simula o que acontece no Stripe (pagamento no PaymentSheet, recusa, processamento…). */
    setStatus(orderId: string, status: PaymentIntentStatus, failureCode: string | null = null) {
      const id = byOrder.get(orderId)!
      const intent = intents.get(id)!
      intent.status = status
      intent.failureCode = failureCode
      intent.amountReceivedCents = status === 'succeeded' ? intent.amountCents : 0
      // Instruções só existem enquanto o pagamento aguarda ação do cliente.
      if (status !== 'requires_action') {
        intent.pix = null
        intent.boleto = null
      }
      return copy(id)
    },
    rejectNextPayer() {
      rejectNextPayer = true
    },
    /** Segura a próxima criação de PaymentIntent até `release()`. */
    holdNextCreate() {
      let release = () => {}
      createGate = new Promise<void>((resolve) => (release = resolve))
      return () => {
        createGate = null
        release()
      }
    },
    /** A próxima confirmação perde a corrida para outra requisição (o Stripe responde unexpected_state). */
    loseNextConfirmRace() {
      conflictNextConfirm = true
    },
    /** Próximo cancelamento recusado pelo Stripe por estado (ex.: Pix mudando de estado). */
    refuseNextCancel() {
      cancelRefusals = 1
    },
    failNextCalls(count: number) {
      failures = count
    },
    reset() {
      intents.clear()
      byOrder.clear()
      refunds.length = 0
      confirmations.length = 0
      failures = 0
      rejectNextPayer = false
      cancelRefusals = 0
      createGate = null
      conflictNextConfirm = false
    },
  }
}

export type FakePaymentGateway = ReturnType<typeof createFakePaymentGateway>
