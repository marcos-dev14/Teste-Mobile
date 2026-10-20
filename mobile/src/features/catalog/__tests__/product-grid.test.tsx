import { fireEvent, screen } from '@testing-library/react-native'

import { ApiError } from '@/lib/api/errors'
import type { Paginated, ProductSummary } from '@/lib/api/types'
import { renderWithProviders } from '@/test-utils'

import { catalogApi } from '../api'
import { columnsFor, ProductGrid } from '../components/product-grid'
import { useProductList } from '../hooks'

jest.mock('../api', () => ({ catalogApi: { list: jest.fn(), get: jest.fn() } }))
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }))

const list = catalogApi.list as jest.MockedFunction<typeof catalogApi.list>

const product: ProductSummary = {
  id: 'p1',
  slug: 'camiseta-basica',
  name: 'Camiseta Básica',
  priceCents: 2999,
  rating: 3.5,
  imageUrl: 'https://example.com/a.jpg',
  colors: [{ id: 'c1', name: 'Branco', hex: '#F2F2EF' }],
  inStock: true,
}

const page = (data: ProductSummary[]): Paginated<ProductSummary> => ({ data, page: 1, pageSize: 20, total: data.length })

function Harness() {
  const query = useProductList({ sort: 'featured' })
  return <ProductGrid query={query} empty={{ title: 'Nada por aqui' }} />
}

describe('ProductGrid', () => {
  beforeEach(() => list.mockReset())

  it('exibe indicador discreto e depois os produtos reais da API', async () => {
    list.mockResolvedValue(page([product]))
    renderWithProviders(<Harness />)
    expect(screen.getByTestId('product-grid-loading')).toBeTruthy()
    expect(await screen.findByText('Camiseta Básica')).toBeTruthy()
    expect(screen.getByText('R$ 29,99')).toBeTruthy()
  })

  it('exibe estado vazio', async () => {
    list.mockResolvedValue(page([]))
    renderWithProviders(<Harness />)
    expect(await screen.findByText('Nada por aqui')).toBeTruthy()
  })

  it('exibe erro e recupera ao tentar novamente', async () => {
    list.mockRejectedValueOnce(new ApiError('network', 0, 'NETWORK_ERROR', 'x')).mockResolvedValueOnce(page([product]))
    renderWithProviders(<Harness />)
    fireEvent.press(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Camiseta Básica')).toBeTruthy()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('adapta colunas à largura da tela', () => {
    expect(columnsFor(320)).toBe(2)
    expect(columnsFor(700)).toBe(3)
    expect(columnsFor(1024)).toBe(4)
  })
})
