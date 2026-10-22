import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { createAddress, getColor, registerUser, setupTestApp } from './helpers.js'

// Conta Stripe sem Pix/boleto habilitados: só cartão é oferecido e aceito.
const ctx = setupTestApp({ PAYMENT_METHODS: 'credit_card' })

describe('métodos de pagamento conforme a configuração', () => {
  it('lista apenas os métodos habilitados', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/v1/payment-methods' })
    expect(response.json()).toEqual({ data: ['credit_card'], testMode: true })
  })

  it('pedido com método desabilitado → 422 PAYMENT_METHOD_UNAVAILABLE', async () => {
    const user = await registerUser(ctx.app)
    const address = await createAddress(ctx.app, user.auth)
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { ...user.auth, 'idempotency-key': randomUUID() },
      payload: { addressId: address.id, paymentMethod: 'pix', items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }] },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('PAYMENT_METHOD_UNAVAILABLE')
  })
})
