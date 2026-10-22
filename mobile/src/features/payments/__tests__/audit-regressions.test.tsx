import { act, renderHook, screen, waitFor } from '@testing-library/react-native'

import OrderResultScreen from '@/app/checkout/success'
import { useSession } from '@/features/auth/session-store'
import { useCheckout } from '@/features/checkout/store'
import { useSubmitOrder } from '@/features/checkout/use-submit-order'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import type { OrderDetail, PaymentSession } from '@/lib/api/types'
import { createTestWrapper, renderWithProviders } from '@/test-utils'

import { pollingInterval } from '../api'
import { requestCardPayment } from '../card-payment-store'

jest.mock('@stripe/stripe-react-native', () => ({ initStripe: jest.fn(async () => {}) }))
// O painel de cartão em si é coberto em payments.test; aqui o cliente "paga" direto.
jest.mock('../card-payment-store', () => ({ requestCardPayment: jest.fn(async () => ({ kind: 'completed' })) }))
jest.mock('expo-linking', () => ({ createURL: (path: string) => `vesti://${path}` }))
jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthBridge: jest.fn(),
}))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), dismissAll: jest.fn(), canDismiss: () => true },
  useLocalSearchParams: () => ({ orderId: 'o1', number: '1001' }),
  usePathname: () => '/checkout/success',
  useIsFocused: () => true,
  Redirect: () => null,
}))

const post = api.post as jest.Mock
const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } }

function order(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 'o1',
    number: 1001,
    status: 'pending_payment',
    paymentStatus: 'requires_action',
    paymentFailureCode: null,
    paymentMethod: 'pix',
    itemCount: 1,
    totalCents: 2999,
    subtotalCents: 2999,
    shippingCents: 0,
    reservedUntil: '2099-01-01T00:30:00.000Z',
    createdAt: '2026-10-21T12:00:00.000Z',
    shippingAddress: {
      fullName: 'Pessoa',
      addressLine1: 'Rua',
      number: '1',
      addressLine2: null,
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'Brasil',
    },
    items: [],
    ...overrides,
  }
}

const pixSession: PaymentSession = {
  method: 'pix',
  paymentIntentId: 'pi_1',
  amountCents: 2999,
  currency: 'brl',
  pix: { qrCodeData: '000201pix', qrCodeImageUrl: 'https://qr.stripe.com/x.png', hostedInstructionsUrl: null, expiresAt: '2099-01-01T00:30:00.000Z' },
}

beforeEach(() => {
  jest.clearAllMocks()
  useSession.setState({ status: 'authenticated', user: { id: 'u1', name: 'Ana', email: 'a@b.c', createdAt: '' } })
  useCheckout.getState().reset()
})

describe('intervalo de consulta do pagamento', () => {
  it('processando: 3 s; Pix aberto: 5 s; Pix vencido: 15 s até o servidor encerrar; boleto: para; 429: recua para 30 s', () => {
    expect(pollingInterval(order({ paymentStatus: 'processing' }))).toBe(3_000)
    expect(pollingInterval(order())).toBe(5_000)
    expect(pollingInterval(order({ reservedUntil: '2000-01-01T00:00:00.000Z' }))).toBe(15_000)
    expect(pollingInterval(order({ paymentMethod: 'boleto' }))).toBe(false)
    expect(pollingInterval(order(), new ApiError('http', 429, 'RATE_LIMITED', 'x'))).toBe(30_000)
    expect(pollingInterval(order({ status: 'paid' }))).toBe(false)
  })
})

describe('tela de resultado', () => {
  it('falha numa consulta periódica não esconde o QR Code do Pix', async () => {
    let fail = false
    post.mockImplementation(async (path: string) => {
      if (path.endsWith('/payment')) return pixSession
      if (fail) throw new ApiError('http', 429, 'RATE_LIMITED', 'Muitas requisições.')
      return order()
    })
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByTestId('pix-qr')).toBeTruthy()

    fail = true
    expect(await screen.findByTestId('refresh-error', undefined, { timeout: 8_000 })).toBeTruthy()
    expect(screen.getByTestId('pix-qr')).toBeTruthy()
  }, 15_000)

  it.each([
    ['refunded', 'Pedido reembolsado'],
    ['placed', 'Pedido recebido'],
    ['delivered', 'Pedido pago'],
  ] as const)('status %s tem texto próprio (não "cancelado")', async (status, title) => {
    post.mockResolvedValue(order({ status, paymentStatus: null, reservedUntil: null }))
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByText(title)).toBeTruthy()
    expect(screen.queryByText('Pedido cancelado')).toBeNull()
  })
})

describe('finalização da compra', () => {
  const cardSession = { method: 'card', paymentIntentId: 'pi_1', amountCents: 2999, currency: 'brl', clientSecret: 's', publishableKey: 'pk_test_x' }
  const input = { addressId: 'a1', paymentMethod: 'credit_card' as const, items: [{ productId: 'p1', colorId: 'c1', quantity: 1 }] }

  it('navega ao resultado mesmo se a tela de revisão for desmontada no meio da operação', async () => {
    let resolveOrder: (value: OrderDetail) => void = () => {}
    post.mockImplementation((path: string) => {
      if (path === '/v1/orders') return new Promise((resolve) => (resolveOrder = resolve))
      if (path.endsWith('/payment')) return Promise.resolve(cardSession)
      return Promise.resolve(order({ paymentMethod: 'credit_card', paymentStatus: 'requires_payment_method' }))
    })
    const { Wrapper } = createTestWrapper()
    const hook = renderHook(() => useSubmitOrder({ onStockChanged: jest.fn() }), { wrapper: Wrapper })
    act(() => hook.result.current.mutate({ input, idempotencyKey: 'k1' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/v1/orders', input, expect.anything()))
    // A pessoa sai da revisão com a criação do pedido em andamento.
    hook.unmount()
    resolveOrder(order({ paymentMethod: 'credit_card', paymentStatus: null }))

    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/checkout/success', params: { orderId: 'o1', number: '1001' } }))
    expect(requestCardPayment).toHaveBeenCalled()
  })

  it('se a consulta após o pagamento com cartão falhar, avisa que está verificando (não mostra erro)', async () => {
    post.mockImplementation(async (path: string) => {
      if (path === '/v1/orders') return order({ paymentMethod: 'credit_card', paymentStatus: null })
      if (path.endsWith('/payment')) return cardSession
      throw new ApiError('network', 0, 'NETWORK_ERROR', 'Falha de conexão.')
    })
    const { Wrapper } = createTestWrapper()
    const hook = renderHook(() => useSubmitOrder({ onStockChanged: jest.fn() }), { wrapper: Wrapper })
    act(() => hook.result.current.mutate({ input, idempotencyKey: 'k2' }))

    await waitFor(() => expect(router.push).toHaveBeenCalled())
    expect(await screen.findByText('Verificando o pagamento…')).toBeTruthy()
    expect(screen.queryByText('Falha de conexão.')).toBeNull()
  })
})
