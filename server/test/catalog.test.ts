import { describe, expect, it } from 'vitest'

import { getColor, setStock, setupTestApp } from './helpers.js'

const ctx = setupTestApp()

describe('produtos', () => {
  it('lista com paginação e total', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/v1/products?pageSize=3&page=2' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toMatchObject({ page: 2, pageSize: 3, total: 7 })
    expect(body.data).toHaveLength(3)
    expect(body.data[0]).toEqual(
      expect.objectContaining({ priceCents: expect.any(Number), imageUrl: expect.stringMatching(/^https:/) }),
    )
  })

  it('busca sem acento e sem diferenciar maiúsculas, com curingas literais', async () => {
    const found = (await ctx.app.inject({ method: 'GET', url: '/v1/products?search=CALCA' })).json()
    expect(found.data.map((product: { slug: string }) => product.slug).sort()).toEqual([
      'calca-jeans-reta',
      'calca-jogger-feminina',
    ])
    const wildcard = (await ctx.app.inject({ method: 'GET', url: '/v1/products?search=%25' })).json()
    expect(wildcard.total).toBe(0)
  })

  it('ordena por preço de forma estável', async () => {
    const asc = (await ctx.app.inject({ method: 'GET', url: '/v1/products?sort=price_asc' })).json()
    const prices = asc.data.map((product: { priceCents: number }) => product.priceCents)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('rejeita parâmetros fora dos limites', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/products?pageSize=500' })).statusCode).toBe(400)
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/products?sort=DROP' })).statusCode).toBe(400)
  })

  it('detalhe traz cores com estoque; inexistente → 404; id inválido → 400', async () => {
    const color = await getColor(ctx.pool, 'calca-jeans-reta')
    const detail = await ctx.app.inject({ method: 'GET', url: `/v1/products/${color.productId}` })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().colors).toHaveLength(2)
    expect(detail.json().colors[0]).toEqual(expect.objectContaining({ stock: expect.any(Number) }))

    const missing = await ctx.app.inject({ method: 'GET', url: '/v1/products/00000000-0000-4000-8000-000000000000' })
    expect(missing.statusCode).toBe(404)
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/products/abc' })).statusCode).toBe(400)
  })

  it('produto desativado não aparece', async () => {
    const color = await getColor(ctx.pool, 'bolsa-transversal')
    await ctx.pool.query('UPDATE products SET is_active = false WHERE id = $1', [color.productId])
    expect((await ctx.app.inject({ method: 'GET', url: `/v1/products/${color.productId}` })).statusCode).toBe(404)
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/products' })).json().total).toBe(6)
  })
})

describe('cotação do carrinho', () => {
  it('calcula totais com os preços do servidor', async () => {
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const jeans = await getColor(ctx.pool, 'calca-jeans-reta', 'Azul Médio')
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/cart/quote',
      payload: {
        items: [
          { productId: shirt.productId, colorId: shirt.colorId, quantity: 2 },
          { productId: jeans.productId, colorId: jeans.colorId, quantity: 1 },
        ],
      },
    })
    expect(response.statusCode).toBe(200)
    const quote = response.json()
    expect(quote.subtotalCents).toBe(shirt.priceCents * 2 + jeans.priceCents)
    expect(quote.itemCount).toBe(3)
    expect(quote.isPurchasable).toBe(true)
  })

  it('não aceita preço enviado pelo cliente', async () => {
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/cart/quote',
      payload: { items: [{ productId: shirt.productId, colorId: shirt.colorId, quantity: 1, price: 1 }] },
    })
    expect(response.statusCode).toBe(400)
  })

  it('sinaliza estoque insuficiente e itens indisponíveis', async () => {
    const shirt = await getColor(ctx.pool, 'camiseta-basica')
    await setStock(ctx.pool, shirt.colorId, 1)
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/cart/quote',
      payload: {
        items: [
          { productId: shirt.productId, colorId: shirt.colorId, quantity: 3 },
          { productId: shirt.productId, colorId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
        ],
      },
    })
    const quote = response.json()
    expect(quote.lines[0]).toMatchObject({ status: 'insufficient_stock', availableStock: 1 })
    expect(quote.unavailable).toHaveLength(1)
    expect(quote.isPurchasable).toBe(false)
  })
})
