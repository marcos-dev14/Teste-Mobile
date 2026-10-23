import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { createFakePaymentGateway } from './fake-payment-gateway.js'
import { createAddress, getColor, getStock, registerUser, setupTestApp } from './helpers.js'

const stripe = createFakePaymentGateway()
const ctx = setupTestApp({}, { paymentGateway: stripe.gateway })

beforeEach(() => stripe.reset())

const deleteAccount = (auth: Record<string, string>, password: string) =>
  ctx.app.inject({ method: 'POST', url: '/v1/me/delete', headers: auth, payload: { password } })

async function buyer() {
  const user = await registerUser(ctx.app)
  const address = await createAddress(ctx.app, user.auth)
  return { ...user, addressId: address.id }
}

async function placeOrder(user: Awaited<ReturnType<typeof buyer>>) {
  const shirt = await getColor(ctx.pool, 'camiseta-basica')
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { ...user.auth, 'idempotency-key': randomUUID() },
    payload: { addressId: user.addressId, paymentMethod: 'credit_card', items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }] },
  })
  expect(response.statusCode).toBe(201)
  return { order: response.json<{ id: string }>(), shirt }
}

describe('exclusão de conta', () => {
  it('senha errada: 403 e nada muda (não é tratado como sessão inválida)', async () => {
    const user = await buyer()
    const response = await deleteAccount(user.auth, 'senhaErrada9')
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('INVALID_PASSWORD')

    const me = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: user.auth })
    expect(me.statusCode).toBe(200)
  })

  it('exige sessão', async () => {
    const response = await ctx.app.inject({ method: 'POST', url: '/v1/me/delete', payload: { password: 'x' } })
    expect(response.statusCode).toBe(401)
  })

  it('apaga endereços e sessões, anonimiza a conta e invalida o access token na hora', async () => {
    const user = await buyer()
    expect((await deleteAccount(user.auth, user.password)).statusCode).toBe(204)

    // Access token emitido antes da exclusão (ainda dentro dos 15 min) deixa de valer.
    const me = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: user.auth })
    expect(me.statusCode).toBe(401)
    const refresh = await ctx.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: user.tokens.refreshToken } })
    expect(refresh.statusCode).toBe(401)
    const login = await ctx.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: user.user.email, password: user.password } })
    expect(login.statusCode).toBe(401)

    const { rows } = await ctx.pool.query<{ name: string; email: string; password_hash: string; deleted_at: Date | null }>(
      'SELECT name, email, password_hash, deleted_at FROM users WHERE id = $1',
      [user.user.id],
    )
    expect(rows[0]).toMatchObject({ name: 'Conta excluída', password_hash: '!' })
    expect(rows[0]!.email).not.toContain(user.user.email.split('@')[0]!)
    expect(rows[0]!.deleted_at).not.toBeNull()
    const counts = await ctx.pool.query<{ addresses: number; tokens: number }>(
      `SELECT (SELECT count(*)::int FROM addresses WHERE user_id = $1) AS addresses,
              (SELECT count(*)::int FROM refresh_tokens WHERE user_id = $1) AS tokens`,
      [user.user.id],
    )
    expect(counts.rows[0]).toEqual({ addresses: 0, tokens: 0 })

    // O e-mail fica livre para um cadastro novo, que não herda nada da conta excluída.
    const again = await registerUser(ctx.app, { email: user.user.email })
    expect(again.user.id).not.toBe(user.user.id)
    const addresses = await ctx.app.inject({ method: 'GET', url: '/v1/addresses', headers: again.auth })
    expect(addresses.json().data).toEqual([])
  })

  it('pedido aguardando pagamento bloqueia; depois de cancelado, exclui e mantém o pedido pelo prazo legal', async () => {
    const user = await buyer()
    const { order, shirt } = await placeOrder(user)

    const blocked = await deleteAccount(user.auth, user.password)
    expect(blocked.statusCode).toBe(409)
    expect(blocked.json().error.code).toBe('ACCOUNT_HAS_ORDERS_IN_PROGRESS')

    const before = await getStock(ctx.pool, shirt.colorId)
    expect((await ctx.app.inject({ method: 'POST', url: `/v1/orders/${order.id}/cancel`, headers: user.auth })).statusCode).toBe(200)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(before + 1)
    expect((await deleteAccount(user.auth, user.password)).statusCode).toBe(204)

    const { rows } = await ctx.pool.query<{ status: string; user_id: string; address_id: string | null }>(
      'SELECT status, user_id, address_id FROM orders WHERE id = $1',
      [order.id],
    )
    // Pedido preservado e ligado à conta anonimizada; o endereço salvo foi apagado (o pedido guarda o snapshot).
    expect(rows[0]).toEqual({ status: 'cancelled', user_id: user.user.id, address_id: null })
  })

  it('pedido pago ainda não entregue também bloqueia', async () => {
    const user = await buyer()
    const { order } = await placeOrder(user)
    await ctx.pool.query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [order.id])
    expect((await deleteAccount(user.auth, user.password)).statusCode).toBe(409)

    await ctx.pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [order.id])
    expect((await deleteAccount(user.auth, user.password)).statusCode).toBe(204)
  })
})
