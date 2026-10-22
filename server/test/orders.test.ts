import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { createAddress, getColor, getStock, registerUser, setStock, setupTestApp } from './helpers.js'

const ctx = setupTestApp()

async function buyer() {
  const user = await registerUser(ctx.app)
  const address = await createAddress(ctx.app, user.auth)
  return { ...user, addressId: address.id }
}

function placeOrder(
  auth: Record<string, string>,
  payload: Record<string, unknown>,
  key: string | null = randomUUID(),
) {
  return ctx.app.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { ...auth, ...(key ? { 'idempotency-key': key } : {}) },
    payload,
  })
}

describe('pedidos', () => {
  it('cria o pedido com preços e totais calculados no servidor e baixa o estoque', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const jeans = await getColor(ctx.pool, 'calca-jeans-reta', 'Azul Médio')

    const response = await placeOrder(user.auth, {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [
        { productId: shirt.productId, colorId: shirt.colorId, quantity: 2 },
        { productId: jeans.productId, colorId: jeans.colorId, quantity: 1 },
      ],
    })
    expect(response.statusCode).toBe(201)
    const order = response.json()
    expect(order).toMatchObject({
      status: 'pending_payment',
      paymentMethod: 'credit_card',
      itemCount: 3,
      subtotalCents: shirt.priceCents * 2 + jeans.priceCents,
      totalCents: shirt.priceCents * 2 + jeans.priceCents,
      shippingAddress: expect.objectContaining({ zipCode: '01310-100', number: '123', neighborhood: 'Bela Vista' }),
    })
    expect(order.number).toBeGreaterThanOrEqual(1001)
    expect(order.items).toHaveLength(2)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 2)
    expect(await getStock(ctx.pool, jeans.colorId)).toBe(jeans.stock - 1)
  })

  it('rejeita preço, total ou userId enviados pelo cliente', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const base = {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    }
    for (const tampered of [
      { ...base, totalPrice: 1 },
      { ...base, userId: randomUUID() },
      { ...base, items: [{ ...base.items[0], price: 1 }] },
    ]) {
      expect((await placeOrder(user.auth, tampered)).statusCode).toBe(400)
    }
  })

  it.each([0, -1, 1.5, 21])('rejeita quantidade inválida (%s)', async (quantity) => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const response = await placeOrder(user.auth, {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity }],
    })
    expect(response.statusCode).toBe(400)
  })

  it('exige Idempotency-Key e autenticação', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const payload = {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    }
    expect((await placeOrder(user.auth, payload, null)).statusCode).toBe(400)
    expect((await placeOrder({}, payload)).statusCode).toBe(401)
  })

  it('é idempotente: mesma chave devolve o mesmo pedido sem baixar estoque de novo', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const key = randomUUID()
    const payload = {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    }
    const first = await placeOrder(user.auth, payload, key)
    const retry = await placeOrder(user.auth, payload, key)
    expect(first.statusCode).toBe(201)
    expect(retry.statusCode).toBe(200)
    expect(retry.json().id).toBe(first.json().id)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 1)

    const different = await placeOrder(user.auth, { ...payload, paymentMethod: 'boleto' }, key)
    expect(different.statusCode).toBe(409)
    expect(different.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED')
  })

  it('não permite usar endereço de outro usuário', async () => {
    const alice = await buyer()
    const bob = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const response = await placeOrder(bob.auth, {
      addressId: alice.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('ADDRESS_NOT_FOUND')
  })

  it('estoque insuficiente em um item aborta o pedido inteiro', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const soldOut = await getColor(ctx.pool, 'calca-jeans-reta', 'Preto Lavado')
    expect(soldOut.stock).toBe(0)

    const response = await placeOrder(user.auth, {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [
        { productId: shirt.productId, colorId: shirt.colorId, quantity: 1 },
        { productId: soldOut.productId, colorId: soldOut.colorId, quantity: 1 },
      ],
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      details: [expect.objectContaining({ colorId: soldOut.colorId, available: 0 })],
    })
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock)
    expect((await ctx.pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n).toBe(0)
  })

  it('rejeita cor que não pertence ao produto informado', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const bag = await getColor(ctx.pool, 'bolsa-transversal')
    const response = await placeOrder(user.auth, {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      // Preço da camiseta com a cor (e estoque) da bolsa.
      items: [{ productId: shirt.productId, colorId: bag.colorId, quantity: 1 }],
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('ITEM_UNAVAILABLE')
  })

  it('lista e detalha apenas pedidos do próprio usuário (sem IDOR)', async () => {
    const alice = await buyer()
    const bob = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const created = (
      await placeOrder(alice.auth, {
        addressId: alice.addressId,
        paymentMethod: 'credit_card',
        items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
      })
    ).json()

    const aliceList = (await ctx.app.inject({ method: 'GET', url: '/v1/orders', headers: alice.auth })).json()
    expect(aliceList.total).toBe(1)
    expect(aliceList.data[0]).toMatchObject({ id: created.id, previewImageUrls: [expect.any(String)] })

    const bobList = (await ctx.app.inject({ method: 'GET', url: '/v1/orders', headers: bob.auth })).json()
    expect(bobList.total).toBe(0)

    const bobDetail = await ctx.app.inject({ method: 'GET', url: `/v1/orders/${created.id}`, headers: bob.auth })
    expect(bobDetail.statusCode).toBe(404)

    const aliceDetail = await ctx.app.inject({ method: 'GET', url: `/v1/orders/${created.id}`, headers: alice.auth })
    expect(aliceDetail.statusCode).toBe(200)
    expect(aliceDetail.json().items[0]).toMatchObject({ productName: 'Camiseta Básica', quantity: 1 })
  })

  it('o snapshot preserva preço e endereço mesmo após mudanças', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const order = (
      await placeOrder(user.auth, {
        addressId: user.addressId,
        paymentMethod: 'credit_card',
        items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
      })
    ).json()

    await ctx.pool.query('UPDATE products SET price_cents = 1 WHERE id = $1', [shirt.productId])
    await ctx.app.inject({ method: 'DELETE', url: `/v1/addresses/${user.addressId}`, headers: user.auth })

    const detail = (await ctx.app.inject({ method: 'GET', url: `/v1/orders/${order.id}`, headers: user.auth })).json()
    expect(detail.totalCents).toBe(shirt.priceCents)
    expect(detail.shippingAddress.city).toBe('São Paulo')
  })

  it('pedidos gravados antes da migration 0002 devolvem número e bairro nulos', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const order = (
      await placeOrder(user.auth, {
        addressId: user.addressId,
        paymentMethod: 'credit_card',
        items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
      })
    ).json()
    await ctx.pool.query(
      `UPDATE orders SET shipping_address = shipping_address - 'number' - 'neighborhood' WHERE id = $1`,
      [order.id],
    )

    const detail = await ctx.app.inject({ method: 'GET', url: `/v1/orders/${order.id}`, headers: user.auth })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().shippingAddress).toMatchObject({ number: null, neighborhood: null, city: 'São Paulo' })
  })
})

describe('pedidos concorrentes', () => {
  it('disputa pela última unidade: exatamente um pedido é aceito', async () => {
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    await setStock(ctx.pool, shirt.colorId, 1)
    const buyers = await Promise.all(Array.from({ length: 6 }, () => buyer()))

    const responses = await Promise.all(
      buyers.map((user) =>
        placeOrder(user.auth, {
          addressId: user.addressId,
          paymentMethod: 'credit_card',
          items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
        }),
      ),
    )
    const statuses = responses.map((response) => response.statusCode).sort()
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409])
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(0)
  })

  it('duplicata simultânea com a mesma chave pela ÚLTIMA unidade recebe o mesmo pedido (não 409)', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    await setStock(ctx.pool, shirt.colorId, 1)
    const key = randomUUID()
    const payload = {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    }
    const responses = await Promise.all(Array.from({ length: 5 }, () => placeOrder(user.auth, payload, key)))
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 200, 200, 200, 201])
    expect(new Set(responses.map((response) => response.json().id)).size).toBe(1)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(0)
  })

  it('retentativas simultâneas com a mesma chave geram um único pedido', async () => {
    const user = await buyer()
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const key = randomUUID()
    const payload = {
      addressId: user.addressId,
      paymentMethod: 'credit_card',
      items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1 }],
    }
    const responses = await Promise.all(Array.from({ length: 5 }, () => placeOrder(user.auth, payload, key)))
    expect(new Set(responses.map((response) => response.json().id)).size).toBe(1)
    expect(responses.filter((response) => response.statusCode === 201)).toHaveLength(1)
    expect(await getStock(ctx.pool, shirt.colorId)).toBe(shirt.stock - 1)
  })
})
