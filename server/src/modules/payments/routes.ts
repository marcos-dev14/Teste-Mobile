import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { idParamsSchema } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { orderDetailSchema } from '../orders/schemas.js'
import type { OrdersService } from '../orders/service.js'
import type { PaymentsService } from './service.js'

const sessionBase = { paymentIntentId: z.string(), amountCents: z.number().int(), currency: z.string() }

/** Por método: o app recebe só o que precisa (nunca a chave secreta nem os dados do pagador). */
const paymentSessionSchema = z.discriminatedUnion('method', [
  z.object({ ...sessionBase, method: z.literal('card'), clientSecret: z.string(), publishableKey: z.string() }),
  z.object({
    ...sessionBase,
    method: z.literal('pix'),
    pix: z.object({
      qrCodeData: z.string(),
      qrCodeImageUrl: z.string(),
      hostedInstructionsUrl: z.string().nullable(),
      expiresAt: z.string(),
    }),
  }),
  z.object({
    ...sessionBase,
    method: z.literal('boleto'),
    boleto: z.object({
      number: z.string(),
      pdfUrl: z.string().nullable(),
      hostedVoucherUrl: z.string().nullable(),
      expiresAt: z.string(),
    }),
  }),
])

/** CPF/CNPJ só para Pix e boleto; validado no serviço e repassado ao Stripe, sem ser gravado. */
const startPaymentBodySchema = z
  .object({ taxId: z.string().trim().min(11).max(18).optional() })
  .strict()
  // Sem corpo (cartão, ou Pix/boleto já gerado) o Fastify entrega null.
  .nullish()

/** Rotas do cliente: sempre autenticadas e restritas aos pedidos do próprio usuário. */
export function paymentRoutes(payments: PaymentsService, orders: OrdersService) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.addHook('onRequest', app.authenticate)

    app.post(
      '/orders/:id/payment',
      {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
        schema: { params: idParamsSchema, body: startPaymentBodySchema, response: { 200: paymentSessionSchema } },
      },
      async (request) => payments.start(request.user.sub, request.params.id, request.body ?? {}),
    )

    // Reconciliação: o servidor lê o PaymentIntent no Stripe; a resposta do SDK no app não decide nada.
    app.post(
      '/orders/:id/payment/sync',
      {
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
        schema: { params: idParamsSchema, response: { 200: orderDetailSchema } },
      },
      async (request) => {
        await payments.sync(request.user.sub, request.params.id)
        return orders.get(request.user.sub, request.params.id)
      },
    )

    app.post(
      '/orders/:id/cancel',
      {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
        schema: { params: idParamsSchema, response: { 200: orderDetailSchema } },
      },
      async (request) => {
        await payments.cancel(request.user.sub, request.params.id)
        return orders.get(request.user.sub, request.params.id)
      },
    )
  }
}

/**
 * Formas de pagamento oferecidas (conforme a disponibilidade real da conta Stripe) e se o
 * ambiente é de teste — o app usa isso para aceitar os CPFs de teste do Stripe e exibir avisos.
 */
export function paymentMethodRoutes(orders: OrdersService, testMode: boolean) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.get(
      '/payment-methods',
      {
        schema: {
          response: { 200: z.object({ data: z.array(z.enum(['credit_card', 'pix', 'boleto'])), testMode: z.boolean() }) },
        },
      },
      async () => ({ data: orders.paymentMethods(), testMode }),
    )
  }
}

/** Webhook do Stripe: sem sessão, autenticado pela assinatura sobre o corpo bruto. */
export function stripeWebhookRoutes(payments: PaymentsService) {
  return async (instance: FastifyInstance) => {
    // Escopo encapsulado: só esta rota recebe o JSON como Buffer (a assinatura cobre os bytes exatos).
    instance.removeContentTypeParser('application/json')
    instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => done(null, body))

    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.post(
      '/webhooks/stripe',
      {
        config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
        schema: { response: { 200: z.object({ received: z.literal(true) }) } },
      },
      async (request) => {
        const signature = request.headers['stripe-signature']
        await payments.handleWebhook(request.body as Buffer, typeof signature === 'string' ? signature : undefined)
        return { received: true as const }
      },
    )
  }
}
