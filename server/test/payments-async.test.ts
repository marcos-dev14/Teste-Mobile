import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { createFakePaymentGateway, intentObject, signedWebhook } from './fake-payment-gateway.js'
import { createAddress, getColor, getStock, registerUser, setupTestApp } from './helpers.js'

const stripe = createFakePaymentGateway()
const ctx = setupTestApp({}, { paymentGateway: stripe.gateway })

beforeEach(() => stripe.reset())

// CPF sintético com dígitos verificadores válidos (não pertence a ninguém).
const SYNTHETIC_CPF = '529.982.247-25'

async function buyer() {
  const user = await registerUser(ctx.app)
  const address = await createAddress(ctx.app, user.auth)
  return { ...user, addressId: address.id }
}

async function placeOrder(user: Awaited<ReturnType<typeof buyer>>, paymentMethod: 'pix' | 'boleto') {
  const shirt = await getColor(ctx.pool, 'camiseta-basica')
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { ...user.auth, 'idempotency-key': randomUUID() },
    payload: { addressId: user.addressId, paymentMethod, items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }] },
  })
  expect(response.statusCode).toBe(201)
  return { order: response.json(), shirt }
}

const start = (auth: Record<string, string>, orderId: string, taxId?: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/v1/orders/${orderId}/payment`,
    headers: auth,
    ...(taxId ? { payload: { taxId } } : {}),
  })
const getOrder = async (auth: Record<string, string>, orderId: string) =>
  (await ctx.app.inject({ method: 'GET', url: `/v1/orders/${orderId}`, headers: auth })).json()
const cancel = (auth: Record<string, string>, orderId: string) =>
  ctx.app.inject({ method: 'POST', url: `/v1/orders/${orderId}/cancel`, headers: auth })
const webhook = (id: string, type: string, object: Record<string, unknown>) => {
  const signed = signedWebhook({ id, type, object })
  return ctx.app.inject({ method: 'POST', url: '/v1/webhooks/stripe', headers: signed.headers, payload: signed.payload })
}

describe('Pix', () => {
  it('pede o CPF/CNPJ, valida e gera o QR Code com vencimento igual à reserva do pedido', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    expect(Date.parse(order.reservedUntil) - Date.now()).toBeLessThan(31 * 60_000)

    const missing = await start(user.auth, order.id)
    expect(missing.statusCode).toBe(422)
    expect(missing.json().error.code).toBe('TAX_ID_REQUIRED')

    const invalid = await start(user.auth, order.id, '529.982.247-24')
    expect(invalid.statusCode).toBe(422)
    expect(invalid.json().error.code).toBe('INVALID_TAX_ID')

    const response = await start(user.auth, order.id, SYNTHETIC_CPF)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      method: 'pix',
      amountCents: order.totalCents,
      currency: 'brl',
      pix: { qrCodeData: expect.stringContaining('pix'), qrCodeImageUrl: expect.stringMatching(/^https:/), expiresAt: order.reservedUntil },
    })
    expect(response.json()).not.toHaveProperty('clientSecret')

    const [sent] = stripe.confirmations
    expect(sent!.payer).toMatchObject({ name: 'Pessoa Teste', email: user.user.email, taxId: '52998224725' })
    expect(sent!.pixExpiresAt?.toISOString()).toBe(order.reservedUntil)
  })

  it('reabrir o pagamento devolve o mesmo QR Code sem pedir o CPF de novo', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    const first = (await start(user.auth, order.id, SYNTHETIC_CPF)).json()
    const again = await start(user.auth, order.id)
    expect(again.statusCode).toBe(200)
    expect(again.json().pix.qrCodeData).toBe(first.pix.qrCodeData)
    expect(stripe.confirmations).toHaveLength(1)
  })

  it('o CPF não é gravado em nenhuma tabela', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    await start(user.auth, order.id, SYNTHETIC_CPF)
    const { rows } = await ctx.pool.query(
      `SELECT (SELECT json_agg(o) FROM orders o)::text || (SELECT json_agg(p) FROM payments p)::text
              || coalesce((SELECT json_agg(e) FROM payment_events e)::text, '') AS dump`,
    )
    expect(rows[0].dump).not.toContain('52998224725')
    expect(rows[0].dump).not.toContain('529.982.247-25')
  })

  it('pago (webhook assinado) → paid; o pedido de outra conta continua inacessível', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    await start(user.auth, order.id, SYNTHETIC_CPF)
    const intent = stripe.setStatus(order.id, 'succeeded')
    expect((await webhook('evt_pix_paid', 'payment_intent.succeeded', intentObject(intent))).statusCode).toBe(200)
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')

    const intruder = await registerUser(ctx.app)
    expect((await start(intruder.auth, order.id, SYNTHETIC_CPF)).statusCode).toBe(404)
  })

  it('Pix expirado no Stripe: pedido segue aguardando com a falha exposta e pode gerar novo QR Code', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    const first = (await start(user.auth, order.id, SYNTHETIC_CPF)).json()
    const expired = stripe.setStatus(order.id, 'requires_payment_method', 'payment_intent_payment_attempt_failed')
    await webhook('evt_pix_expired', 'payment_intent.payment_failed', intentObject(expired, { last_payment_error: { code: 'payment_intent_payment_attempt_failed' } }))

    expect(await getOrder(user.auth, order.id)).toMatchObject({
      status: 'pending_payment',
      paymentStatus: 'requires_payment_method',
      paymentFailureCode: 'payment_intent_payment_attempt_failed',
    })
    expect((await start(user.auth, order.id)).json().error.code).toBe('TAX_ID_REQUIRED')
    const renewed = (await start(user.auth, order.id, SYNTHETIC_CPF)).json()
    expect(renewed.pix.qrCodeData).not.toBe(first.pix.qrCodeData)
  })

  it('outra requisição confirma o Pix no mesmo instante: devolve as instruções vigentes (não 500)', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    stripe.loseNextConfirmRace()
    const response = await start(user.auth, order.id, SYNTHETIC_CPF)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ method: 'pix', pix: { qrCodeData: expect.any(String) } })
  })

  it('dados do pagador recusados pelo Stripe → 422 (não é indisponibilidade)', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    stripe.rejectNextPayer()
    const response = await start(user.auth, order.id, SYNTHETIC_CPF)
    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('PAYER_DETAILS_REJECTED')
  })

  it('Stripe recusa o cancelamento por estado (sem ser indisponibilidade): segue o estado real, sem 503', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user, 'pix')
    await start(user.auth, order.id, SYNTHETIC_CPF)

    // O Pix expirou no Stripe no mesmo instante do cancelamento: a recusa vem, mas o PI já está cancelado.
    stripe.refuseNextCancel()
    stripe.setStatus(order.id, 'canceled')
    const raced = await cancel(user.auth, order.id)
    expect(raced.statusCode).toBe(200)
    expect(raced.json().status).toBe('cancelled')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })

  it('recusa por estado com o Pix ainda em aberto → 409 (tente de novo), nunca 503', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'pix')
    await start(user.auth, order.id, SYNTHETIC_CPF)
    stripe.refuseNextCancel()
    const response = await cancel(user.auth, order.id)
    expect(response.statusCode).toBe(409)
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
  })

  it('cliente cancela o Pix pendente → cancelado e estoque devolvido', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user, 'pix')
    await start(user.auth, order.id, SYNTHETIC_CPF)
    const response = await cancel(user.auth, order.id)
    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe('cancelled')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })
})

describe('boleto', () => {
  it('reserva o estoque até o vencimento + prazo de confirmação e gera o boleto com o endereço do pedido', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'boleto')
    const days = (Date.parse(order.reservedUntil) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)

    const response = await start(user.auth, order.id, '000.000.000-00')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      method: 'boleto',
      boleto: { number: expect.any(String), pdfUrl: expect.stringMatching(/^https:/), expiresAt: expect.any(String) },
    })
    const [sent] = stripe.confirmations
    expect(sent!.boletoExpiresAfterDays).toBe(3)
    expect(sent!.payer.address).toEqual({ line1: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', postalCode: '01310-100' })
  })

  it('boleto emitido não pode ser cancelado: 409 e nada muda', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user, 'boleto')
    await start(user.auth, order.id, '000.000.000-00')
    const response = await cancel(user.auth, order.id)
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('ORDER_NOT_CANCELLABLE')
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 1)
  })

  it('a rotina de expiração não encerra boleto ainda em aberto e o adia (não ocupa o lote a cada execução)', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'boleto')
    await start(user.auth, order.id, '000.000.000-00')
    await ctx.pool.query(`UPDATE orders SET reserved_until = now() - interval '1 minute' WHERE id = $1`, [order.id])
    expect(await ctx.app.paymentsService.expireStale()).toBe(0)
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')

    const { rows } = await ctx.pool.query(
      `SELECT next_expiration_check_at > now() + interval '10 minutes' AS postponed FROM orders WHERE id = $1`,
      [order.id],
    )
    expect(rows[0].postponed).toBe(true)
    // Na execução seguinte ele nem é consultado no Stripe: a falha programada continua sem uso.
    stripe.failNextCalls(1)
    expect(await ctx.app.paymentsService.expireStale()).toBe(0)
    await expect(stripe.gateway.retrievePaymentIntent(stripe.intentForOrder(order.id)!.id)).rejects.toThrow()
  })

  it('boleto vencido sem pagamento (payment_failed) → pedido expirado e estoque devolvido', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user, 'boleto')
    await start(user.auth, order.id, '000.000.000-00')
    const expired = stripe.setStatus(order.id, 'requires_payment_method', 'payment_intent_payment_attempt_expired')
    await webhook('evt_boleto_expired', 'payment_intent.payment_failed', intentObject(expired, { last_payment_error: { code: 'payment_intent_payment_attempt_expired' } }))

    expect(await getOrder(user.auth, order.id)).toMatchObject({ status: 'expired', paymentStatus: 'canceled' })
    expect(stripe.intentForOrder(order.id)?.status).toBe('canceled')
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
  })

  it('boleto pago (webhook) → paid, sem liberar nada antes disso', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user, 'boleto')
    await start(user.auth, order.id, '000.000.000-00')
    expect((await getOrder(user.auth, order.id)).status).toBe('pending_payment')
    const paid = stripe.setStatus(order.id, 'succeeded')
    await webhook('evt_boleto_paid', 'payment_intent.succeeded', intentObject(paid))
    expect((await getOrder(user.auth, order.id)).status).toBe('paid')
  })
})
