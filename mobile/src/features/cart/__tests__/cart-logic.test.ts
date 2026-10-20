import { addItem, countItems, MAX_CART_LINES, MAX_QUANTITY_PER_ITEM, quantityInCart, removeItem, setQuantity, toPurchaseItems, type CartItem } from '../cart-logic'

const base: Omit<CartItem, 'quantity'> = {
  productId: 'p1',
  colorId: 'c1',
  snapshot: { name: 'Camiseta', colorName: 'Branco', colorHex: '#FFFFFF', imageUrl: 'https://x/y.jpg', priceCents: 2999 },
}

describe('cart-logic', () => {
  it('adiciona e soma quantidades da mesma cor', () => {
    let items = addItem([], base, 2)
    items = addItem(items, base, 3)
    expect(items).toHaveLength(1)
    expect(items[0]!.quantity).toBe(5)
    items = addItem(items, { ...base, colorId: 'c2' }, 1)
    expect(countItems(items)).toBe(6)
    expect(quantityInCart(items, 'c2')).toBe(1)
  })

  it('limita a quantidade entre 1 e o máximo do servidor', () => {
    let items = addItem([], base, 50)
    expect(items[0]!.quantity).toBe(MAX_QUANTITY_PER_ITEM)
    items = setQuantity(items, 'c1', 0)
    expect(items[0]!.quantity).toBe(1)
  })

  it('recusa nova cor além do limite de linhas do pedido, mas aceita somar em linha existente', () => {
    let items: CartItem[] = []
    for (let index = 0; index < MAX_CART_LINES; index += 1) items = addItem(items, { ...base, colorId: `c${index}` }, 1)
    expect(addItem(items, { ...base, colorId: 'extra' }, 1)).toBe(items)
    expect(quantityInCart(addItem(items, { ...base, colorId: 'c0' }, 1), 'c0')).toBe(2)
  })

  it('remove item', () => {
    expect(removeItem(addItem([], base, 1), 'c1')).toEqual([])
  })

  it('envia ao servidor apenas ids e quantidades (nunca preço)', () => {
    const payload = toPurchaseItems(addItem([], base, 2))
    expect(payload).toEqual([{ productId: 'p1', colorId: 'c1', quantity: 2 }])
    expect(JSON.stringify(payload)).not.toMatch(/price/i)
  })
})
