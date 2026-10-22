import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { MAX_PENDING_ORDERS_PER_USER } from '../src/modules/orders/service.js'
import { createFakePaymentGateway, intentObject, signedWebhook } from './fake-payment-gateway.js'
import { createAddress, getColor, getStock, registerUser, setupTestApp } from './helpers.js'

const stripe = createFakePaymentGateway()
const ctx = setupTestApp({}, { paymentGateway: stripe.gateway })

beforeEach(() => stripe.reset())

async function buyer() {
  const user = await registerUser(ctx.app)
  const address = await createAddress(ctx.app, user.auth)
  return { ...user, addressId: address.id }
}

async function placeOrder(user: Awaited<ReturnType<typeof buyer>>, quantity = 1, paymentMethod = 'credit_card') {
  const shirt = await getColor(ctx.pool, 'camiseta-basica')
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { ...user.auth, 'idempotency-key': randomUUID() },
    payload: {
      addressId: user.addressId,
      paymentMethod,
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity }],
    },
  })
  return { response, order: response.json(), shirt }
}

const startPayment = (auth: Record<string, string>, orderId: string) =>
  ctx.app.inject({ method: 'POST', url: `/v1/orders/${orderId}/payment`, headers: auth })
const syncPayment = (auth: Record<string, string>, orderId: string) =>
  ctx.app.inject({ method: 'POST', url: `/v1/orders/${orderId}/payment/sync`, headers: auth })
const getOrder = async (auth: Record<string, string>, orderId: string) =>
  (await ctx.app.inject({ method: 'GET', url: `/v1/orders/${orderId}`, headers: auth })).json()
const sendWebhook = (webhook: { payload: string; headers: Record<string, string> }) =>
  ctx.app.inject({ method: 'POST', url: '/v1/webhooks/stripe', headers: webhook.headers, payload: webhook.payload })

/** Pedido com PaymentIntent já criado (o app abriu o PaymentSheet). */
async function orderAwaitingCard() {
  const user = await buyer()
  const { order, shirt } = await placeOrder(user)
  expect((await startPayment(user.auth, order.id)).statusCode).toBe(200)
  return { user, order, shirt }
}

describe('pedido aguardando pagamento', () => {
  it('nasce em pending_payment com estoque reservado por 30 min', async () => {
    const user = await buyer()
    const { response, order, shirt } = await placeOrder(user, 2)
    expect(response.statusCode).toBe(201)
    expect(order).toMatchObject({ status: 'pending_payment', paymentStatus: null })
    // A reserva usa o relógio do banco; tolerância para diferença com o relógio do processo.
    const minutes = (Date.parse(order.reservedUntil) - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(29)
    expect(minutes).toBeLessThan(31)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 2)
  })

  it(`no máximo ${MAX_PENDING_ORDERS_PER_USER} pedidos aguardando pagamento por usuário`, async () => {
    const user = await buyer()
    for (let index = 0; index < MAX_PENDING_ORDERS_PER_USER; index += 1) {
      expect((await placeOrder(user)).response.statusCode).toBe(201)
    }
    const extra = await placeOrder(user)
    expect(extra.response.statusCode).toBe(409)
    expect(extra.order.error.code).toBe('TOO_MANY_PENDING_ORDERS')
  })
})

describe('início do pagamento', () => {
  it('cria o PaymentIntent com o total do banco e devolve só o necessário ao PaymentSheet', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 3)
    const response = await startPayment(user.auth, order.id)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      method: 'card',
      paymentIntentId: expect.stringMatching(/^pi_/),
      clientSecret: expect.stringContaining('_secret_'),
      publishableKey: 'pk_test_fakepublishable',
      amountCents: order.totalCents,
      currency: 'brl',
    })
    expect(stripe.intentForOrder(order.id)?.amountCents).toBe(order.totalCents)
  })

  it('repetir o início reaproveita o mesmo PaymentIntent', async () => {
    const { user, order } = await orderAwaitingCard()
    const again = await startPayment(user.auth, order.id)
    expect(again.json().paymentIntentId).toBe(stripe.intentForOrder(order.id)!.id)
    const { rows } = await ctx.pool.query('SELECT count(*)::int AS total FROM payments WHERE order_id = $1', [order.id])
    expect(rows[0].total).toBe(1)
  })

  it('pedido de outra conta → 404 em pagar, sincronizar e cancelar', async () => {
    const { order } = await orderAwaitingCard()
    const intruder = await registerUser(ctx.app)
    for (const path of ['payment', 'payment/sync', 'cancel']) {
      const response = await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/${path}`, headers: intruder.auth })
      expect(response.statusCode).toBe(404)
    }
  })

  it('Stripe indisponível → 503 e o pedido continua aguardando (nova tentativa funciona)', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user)
    stripe.failNextCalls(1)
    const failed = await startPayment(user.auth, order.id)
    expect(failed.statusCode).toBe(503)
    expect(failed.json().error.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE')
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
    expect((await startPayment(user.auth, order.id)).statusCode).toBe(200)
  })

  it('reserva vencida → 409 ORDER_EXPIRED', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user)
    await ctx.pool.query(`UPDATE orders SET reserved_until = now() - interval '1 minute' WHERE id = $1`, [order.id])
    const response = await startPayment(user.auth, order.id)
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('ORDER_EXPIRED')
  })
})

describe('corridas no início do pagamento', () => {
  it('cancelamento enquanto o 1º início ainda cria o PaymentIntent: nenhum client secret para pedido fechado', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user)
    const release = stripe.holdNextCreate()
    const starting = startPayment(user.auth, order.id)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const cancelled = await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/cancel`, headers: user.auth })
    expect(cancelled.json().status).toBe('cancelled')
    release()

    const late = await starting
    expect(late.statusCode).toBe(409)
    expect(late.json()).not.toHaveProperty('clientSecret')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })
})

describe('confirmação pelo servidor (reconciliação)', () => {
  it('pagamento aprovado no Stripe → paid; o estoque continua baixado', async () => {
    const { user, order, shirt } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'succeeded')
    const response = await syncPayment(user.auth, order.id)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'paid', paymentStatus: 'succeeded', reservedUntil: null })
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 1)
  })

  it('o app não consegue marcar como pago: sem aprovação no Stripe, sync não muda nada', async () => {
    const { user, order } = await orderAwaitingCard()
    const response = await syncPayment(user.auth, order.id)
    expect(response.json()).toMatchObject({ status: 'pending_payment', paymentStatus: 'requires_payment_method' })
  })

  it('cartão recusado → continua aguardando e pode tentar de novo', async () => {
    const { user, order } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'requires_payment_method')
    expect((await syncPayment(user.auth, order.id)).json().status).toBe('pending_payment')
    expect((await startPayment(user.auth, order.id)).statusCode).toBe(200)
  })

  it('pagamento em processamento → aguardando, com status do pagamento exposto', async () => {
    const { user, order } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'processing')
    expect((await syncPayment(user.auth, order.id)).json()).toMatchObject({ status: 'pending_payment', paymentStatus: 'processing' })
  })
})

describe('webhook do Stripe', () => {
  it('evento assinado de sucesso → paid', async () => {
    const { user, order } = await orderAwaitingCard()
    const intent = stripe.setStatus(order.id, 'succeeded')
    const response = await sendWebhook(signedWebhook({ id: 'evt_ok', type: 'payment_intent.succeeded', object: intentObject(intent) }))
    expect(response.statusCode).toBe(200)
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')
  })

  it('webhook duplicado é processado uma única vez', async () => {
    const { user, order } = await orderAwaitingCard()
    const intent = stripe.setStatus(order.id, 'succeeded')
    const webhook = signedWebhook({ id: 'evt_dup', type: 'payment_intent.succeeded', object: intentObject(intent) })
    expect((await sendWebhook(webhook)).statusCode).toBe(200)
    expect((await sendWebhook(webhook)).statusCode).toBe(200)
    const { rows } = await ctx.pool.query(`SELECT count(*)::int AS total FROM payment_events WHERE provider_event_id = 'evt_dup'`)
    expect(rows[0].total).toBe(1)
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')
  })

  it('assinatura inválida, de outro segredo ou ausente → 400 e nada muda', async () => {
    const { user, order } = await orderAwaitingCard()
    const intent = stripe.setStatus(order.id, 'succeeded')
    const valid = signedWebhook({ id: 'evt_x', type: 'payment_intent.succeeded', object: intentObject(intent) })
    const attempts = [
      { ...valid, payload: valid.payload.replace('"amount":', '"amount": ') },
      signedWebhook({ id: 'evt_y', type: 'payment_intent.succeeded', object: intentObject(intent) }, 'whsec_outrosegredo'),
      { payload: valid.payload, headers: { 'content-type': 'application/json' } },
    ]
    for (const attempt of attempts) {
      const response = await sendWebhook(attempt)
      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('INVALID_SIGNATURE')
    }
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
  })

  it('evento fora de ordem não regride um estado final', async () => {
    const { user, order } = await orderAwaitingCard()
    const succeeded = stripe.setStatus(order.id, 'succeeded')
    await sendWebhook(signedWebhook({ id: 'evt_1', type: 'payment_intent.succeeded', object: intentObject(succeeded) }))
    const late = signedWebhook({
      id: 'evt_2',
      type: 'payment_intent.processing',
      object: intentObject({ ...succeeded, status: 'processing', amountReceivedCents: 0 }),
    })
    expect((await sendWebhook(late)).statusCode).toBe(200)
    expect(await getOrder(user.auth, order.id)).toMatchObject({ status: 'paid', paymentStatus: 'succeeded' })
  })

  it('valor, moeda ou pedido diferentes do registrado são ignorados', async () => {
    const { user, order } = await orderAwaitingCard()
    const intent = stripe.setStatus(order.id, 'succeeded')
    const tampered = [
      intentObject(intent, { amount: 1, amount_received: 1 }),
      intentObject(intent, { currency: 'usd' }),
      intentObject(intent, { metadata: { order_id: randomUUID() } }),
    ]
    for (const [index, object] of tampered.entries()) {
      await sendWebhook(signedWebhook({ id: `evt_t${index}`, type: 'payment_intent.succeeded', object }))
    }
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
  })

  it('reembolso total de pedido pago → refunded e estoque devolvido', async () => {
    const { user, order, shirt } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'succeeded')
    await syncPayment(user.auth, order.id)
    const intent = stripe.intentForOrder(order.id)!
    await sendWebhook(
      signedWebhook({
        id: 'evt_refund',
        type: 'charge.refunded',
        object: { id: 'ch_1', object: 'charge', payment_intent: intent.id, amount: intent.amountCents, amount_refunded: intent.amountCents, refunded: true },
      }),
    )
    expect((await getOrder(user.auth, order.id)).status).toBe('refunded')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })

  it('evento livemode (validamente assinado) é ignorado: o sistema opera só em teste', async () => {
    const { user, order } = await orderAwaitingCard()
    const intent = stripe.setStatus(order.id, 'succeeded')
    const live = signedWebhook({ id: 'evt_live', type: 'payment_intent.succeeded', object: intentObject(intent), livemode: true })
    expect((await sendWebhook(live)).statusCode).toBe(200)
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
  })

  it('eventos de outros tipos são aceitos e ignorados', async () => {
    const response = await sendWebhook(signedWebhook({ id: 'evt_other', type: 'customer.created', object: { id: 'cus_1', object: 'customer' } }))
    expect(response.statusCode).toBe(200)
  })
})

describe('cancelamento e expiração', () => {
  it('cliente cancela pedido aguardando: PaymentIntent cancelado e estoque devolvido', async () => {
    const { user, order, shirt } = await orderAwaitingCard()
    const response = await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/cancel`, headers: user.auth })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'cancelled', paymentStatus: 'canceled' })
    expect(stripe.intentForOrder(order.id)?.status).toBe('canceled')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)

    const again = await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/cancel`, headers: user.auth })
    expect(again.statusCode).toBe(409)
  })

  it('cancelar um pedido já pago no Stripe (webhook ainda não chegou) → 409 e o pedido vira pago', async () => {
    const { user, order } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'succeeded')
    const response = await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/cancel`, headers: user.auth })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('ORDER_ALREADY_PAID')
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')
  })

  it('reserva vencida: a rotina marca como expirado, devolve o estoque e cancela o PaymentIntent', async () => {
    const { user, order, shirt } = await orderAwaitingCard()
    const neverPaid = await placeOrder(user) // sem PaymentIntent
    await ctx.pool.query(`UPDATE orders SET reserved_until = now() - interval '1 minute' WHERE id = ANY($1)`, [[order.id, neverPaid.order.id]])

    expect(await ctx.app.paymentsService.expireStale()).toBe(2)
    expect((await getOrder(user.auth, order.id)).status).toBe('expired')
    expect((await getOrder(user.auth, neverPaid.order.id)).status).toBe('expired')
    expect(stripe.intentForOrder(order.id)?.status).toBe('canceled')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })

  it('reserva vencida mas já paga no Stripe (webhook perdido) → vira paid, não cancela', async () => {
    const { user, order } = await orderAwaitingCard()
    stripe.setStatus(order.id, 'succeeded')
    await ctx.pool.query(`UPDATE orders SET reserved_until = now() - interval '1 minute' WHERE id = $1`, [order.id])
    await ctx.app.paymentsService.expireStale()
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')
  })

  it('reembolso que falha não se perde: a rotina tenta de novo e reembolsa uma única vez', async () => {
    const { user, order } = await orderAwaitingCard()
    await ctx.pool.query(`UPDATE orders SET status = 'expired', reserved_until = NULL WHERE id = $1`, [order.id])
    const intent = stripe.setStatus(order.id, 'succeeded')
    // O Stripe falha bem na hora do reembolso automático.
    stripe.failNextCalls(1)
    expect((await sendWebhook(signedWebhook({ id: 'evt_late_fail', type: 'payment_intent.succeeded', object: intentObject(intent) }))).statusCode).toBe(200)
    expect(stripe.refunds).toEqual([])
    expect((await getOrder(user.auth, order.id)).status).toBe('expired')

    expect(await ctx.app.paymentsService.retryRefunds()).toBe(1)
    expect(stripe.refunds).toEqual([intent.id])
    expect((await getOrder(user.auth, order.id)).status).toBe('refunded')
    // Nada mais pendente: não reembolsa de novo.
    expect(await ctx.app.paymentsService.retryRefunds()).toBe(0)
    expect(stripe.refunds).toHaveLength(1)
  })

  it('pagamento aprovado depois do cancelamento → reembolso automático e pedido refunded', async () => {
    const { user, order } = await orderAwaitingCard()
    await ctx.pool.query(`UPDATE orders SET status = 'cancelled', reserved_until = NULL WHERE id = $1`, [order.id])
    const intent = stripe.setStatus(order.id, 'succeeded')
    await sendWebhook(signedWebhook({ id: 'evt_late', type: 'payment_intent.succeeded', object: intentObject(intent) }))
    expect(stripe.refunds).toEqual([intent.id])
    expect((await getOrder(user.auth, order.id)).status).toBe('refunded')
  })
})
