import { describe, expect, it } from 'vitest'

import { AppError } from '../../lib/errors.js'
import { aggregateItems, buildQuote, type ColorPricingRow } from './pricing.js'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const C1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const C2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const row = (overrides: Partial<ColorPricingRow>): ColorPricingRow => ({
  colorId: C1,
  productId: P1,
  productName: 'Camiseta',
  productActive: true,
  colorName: 'Branco',
  colorHex: '#FFFFFF',
  imageUrl: 'https://example.com/a.jpg',
  priceCents: 2999,
  stock: 10,
  ...overrides,
})

describe('aggregateItems', () => {
  it('soma quantidades da mesma cor', () => {
    const merged = aggregateItems([
      { productId: P1, colorId: C1, quantity: 2 },
      { productId: P2, colorId: C2, quantity: 1 },
      { productId: P1, colorId: C1, quantity: 3 },
    ])
    expect(merged).toEqual([
      { productId: P1, colorId: C1, quantity: 5 },
      { productId: P2, colorId: C2, quantity: 1 },
    ])
  })

  it('rejeita soma acima do limite por item', () => {
    expect(() =>
      aggregateItems([
        { productId: P1, colorId: C1, quantity: 15 },
        { productId: P1, colorId: C1, quantity: 6 },
      ]),
    ).toThrow(AppError)
  })
})

describe('buildQuote', () => {
  it('calcula linhas, subtotal e total apenas com preços do banco', () => {
    const quote = buildQuote(
      [
        { productId: P1, colorId: C1, quantity: 2 },
        { productId: P2, colorId: C2, quantity: 1 },
      ],
      [row({}), row({ colorId: C2, productId: P2, priceCents: 8999, productName: 'Calça' })],
    )
    expect(quote.lines.map((line) => line.lineTotalCents)).toEqual([5998, 8999])
    expect(quote.itemCount).toBe(3)
    expect(quote.subtotalCents).toBe(14997)
    expect(quote.totalCents).toBe(14997 + quote.shippingCents)
    expect(quote.isPurchasable).toBe(true)
  })

  it('marca estoque insuficiente sem remover a linha', () => {
    const quote = buildQuote([{ productId: P1, colorId: C1, quantity: 5 }], [row({ stock: 2 })])
    expect(quote.lines[0]).toMatchObject({ status: 'insufficient_stock', availableStock: 2 })
    expect(quote.isPurchasable).toBe(false)
  })

  it('trata cor inexistente, de outro produto ou produto inativo como indisponível', () => {
    const quote = buildQuote(
      [
        { productId: P1, colorId: C3, quantity: 1 }, // inexistente
        { productId: P2, colorId: C1, quantity: 1 }, // cor pertence a P1
        { productId: P2, colorId: C2, quantity: 1 }, // produto inativo
      ],
      [row({}), row({ colorId: C2, productId: P2, productActive: false })],
    )
    expect(quote.lines).toHaveLength(0)
    expect(quote.unavailable).toHaveLength(3)
    expect(quote.subtotalCents).toBe(0)
    expect(quote.isPurchasable).toBe(false)
  })

  it('carrinho vazio não é comprável', () => {
    expect(buildQuote([], []).isPurchasable).toBe(false)
  })
})
