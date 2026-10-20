import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'

import ProductScreen, { ADD_COOLDOWN_MS } from '@/app/product/[id]'
import { catalogApi } from '@/features/catalog/api'
import type { ProductDetail } from '@/lib/api/types'
import { renderWithProviders } from '@/test-utils'

import { MAX_CART_LINES } from '../cart-logic'
import { useCartStore } from '../store'

jest.mock('@/features/catalog/api', () => ({ catalogApi: { list: jest.fn(), get: jest.fn() } }))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'p1' }),
}))

const product: ProductDetail = {
  id: 'p1',
  slug: 'camiseta',
  name: 'Camiseta',
  description: 'Algodão.',
  priceCents: 2999,
  rating: 4.5,
  imageUrls: ['https://example.com/a.jpg'],
  colors: [{ id: 'c1', name: 'Branco', hex: '#FFFFFF', imageUrls: ['https://example.com/a.jpg'], stock: 5 }],
  inStock: true,
}

// O badge é oculto para leitores de tela (o rótulo do botão já anuncia a contagem).
const badge = () => screen.getByTestId('cart-badge', { includeHiddenElements: true })
const count = () => useCartStore.getState().items.reduce((total, item) => total + item.quantity, 0)

async function renderProduct() {
  jest.mocked(catalogApi.get).mockResolvedValue(product)
  renderWithProviders(<ProductScreen />)
  return screen.findByTestId('add-to-cart')
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('adicionar à sacola — feedback', () => {
  it('atualiza a sacola, o contador do ícone e o rótulo de acessibilidade, e mostra "Na sacola"', async () => {
    const button = await renderProduct()
    expect(screen.queryByTestId('cart-badge', { includeHiddenElements: true })).toBeNull()

    fireEvent.press(button)

    expect(count()).toBe(1)
    await waitFor(() => expect(badge()).toHaveTextContent('1'))
    expect(screen.getByLabelText('Abrir sacola, 1 item')).toBeTruthy()
    expect(screen.getByText('Na sacola')).toBeTruthy()
    expect(screen.getByText('1× Camiseta (Branco) na sacola')).toBeTruthy()
  })

  it('toque duplo rápido adiciona uma vez; um novo toque depois do intervalo adiciona de novo', async () => {
    const button = await renderProduct()

    fireEvent.press(button)
    fireEvent.press(button)
    expect(count()).toBe(1)

    await act(() => new Promise((resolve) => setTimeout(resolve, ADD_COOLDOWN_MS + 20)))
    fireEvent.press(button)
    expect(count()).toBe(2)
    await waitFor(() => expect(badge()).toHaveTextContent('2'))
  })

  it('quando não pode adicionar (limite de itens), não mostra sucesso nem altera a sacola', async () => {
    const others = Array.from({ length: MAX_CART_LINES }, (_, index) => ({
      productId: `p${index + 10}`,
      colorId: `c${index + 10}`,
      quantity: 1,
      snapshot: { name: 'Outro', colorName: 'Preto', colorHex: '#000000', imageUrl: 'https://example.com/b.jpg', priceCents: 100 },
    }))
    useCartStore.setState({ items: others })
    const button = await renderProduct()

    fireEvent.press(button)

    expect(useCartStore.getState().items).toHaveLength(MAX_CART_LINES)
    expect(screen.queryByText('Na sacola')).toBeNull()
    expect(screen.getByText(`A sacola aceita até ${MAX_CART_LINES} itens diferentes por pedido.`)).toBeTruthy()
    expect(badge()).toHaveTextContent(String(MAX_CART_LINES))
  })
})
