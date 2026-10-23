import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { runIntegrityChecks } from '../src/db/integrity.js'
import { createAddress, getColor, registerUser, setupTestApp } from './helpers.js'

const ctx = setupTestApp()

describe('verificações de integridade', () => {
  it('banco consistente → tudo zero; inconsistência plantada → detectada', async () => {
    const user = await registerUser(ctx.app)
    const address = await createAddress(ctx.app, user.auth)
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const order = (
      await ctx.app.inject({
        method: 'POST',
        url: '/v1/orders',
        headers: { ...user.auth, 'idempotency-key': randomUUID() },
        payload: { addressId: address.id, paymentMethod: 'credit_card', items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }] },
      })
    ).json()
    expect((await runIntegrityChecks(ctx.pool)).every((check) => check.count === 0)).toBe(true)

    // Planta: pedido "pago" sem pagamento confirmado.
    await ctx.pool.query(`UPDATE orders SET status = 'paid', reserved_until = NULL WHERE id = $1`, [order.id])
    const results = await runIntegrityChecks(ctx.pool)
    expect(results.find((check) => check.id === 'paid_without_payment')?.count).toBe(1)
  })
})
