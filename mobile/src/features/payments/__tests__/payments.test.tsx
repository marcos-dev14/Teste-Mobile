import { handleNextAction, initStripe } from '@stripe/stripe-react-native'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import OrderResultScreen from '@/app/checkout/success'
import { useSession } from '@/features/auth/session-store'
import { api } from '@/lib/api/client'
import type { OrderDetail, PaymentSession } from '@/lib/api/types'
import { renderWithProviders } from '@/test-utils'

import { CardPaymentHost } from '../card-payment-sheet'
import { useCardPayment } from '../card-payment-store'
import { payWithCard } from '../payment-sheet'

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(async () => {}),
  handleNextAction: jest.fn(async () => ({ paymentIntent: { status: 'Succeeded' } })),
  CardActionError: { Canceled: 'Canceled', Failed: 'Failed', Unknown: 'Unknown' },
}))
// Os campos do Stripe.js (WebView) viram um botão que simula o cartão preenchido;
// `mockConfirm` faz o papel do `confirmCardPayment` dentro da página.
jest.mock('../stripe-card-fields', () => {
  const React = jest.requireActual('react')
  const { Pressable } = jest.requireActual('react-native')
  const mockConfirm = jest.fn(async () => ({ status: 'succeeded' }))
  const StripeCardFields = React.forwardRef(function MockStripeCardFields(
    { onCompleteChange }: { onCompleteChange: (complete: boolean) => void },
    ref: unknown,
  ): ReactNode {
    React.useImperativeHandle(ref, () => ({ confirm: mockConfirm }))
    return <Pressable testID="mock-fill-card" onPress={() => onCompleteChange(true)} />
  })
  return { StripeCardFields, mockConfirm }
})
// Sem manifesto do Expo no Jest: o esquema de retorno é fixo.
jest.mock('expo-linking', () => ({ createURL: (path: string) => `vesti://${path}` }))
jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthBridge: jest.fn(),
}))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false },
  useLocalSearchParams: () => ({ orderId: 'o1', number: '1001' }),
  usePathname: () => '/checkout/success',
  useIsFocused: () => true,
  Redirect: () => null,
}))

const post = api.post as jest.Mock
const { mockConfirm: confirm } = jest.requireMock('../stripe-card-fields') as { mockConfirm: jest.Mock }
const nextAction = handleNextAction as jest.Mock

const session: Extract<PaymentSession, { method: 'card' }> = {
  method: 'card',
  paymentIntentId: 'pi_1',
  clientSecret: 'pi_1_secret_x',
  publishableKey: 'pk_test_abc',
  amountCents: 2999,
  currency: 'brl',
}

function order(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 'o1',
    number: 1001,
    status: 'pending_payment',
    paymentStatus: 'requires_payment_method',
    paymentFailureCode: null,
    paymentMethod: 'credit_card',
    itemCount: 1,
    totalCents: 2999,
    subtotalCents: 2999,
    shippingCents: 0,
    reservedUntil: '2099-01-01T00:30:00.000Z',
    createdAt: '2026-10-20T18:00:00.000Z',
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

beforeEach(() => {
  jest.clearAllMocks()
  useSession.setState({ status: 'authenticated', user: { id: 'u1', name: 'Ana', email: 'a@b.c', createdAt: '' } })
})

const renderResult = () =>
  renderWithProviders(
    <>
      <OrderResultScreen />
      <CardPaymentHost />
    </>,
  )

/** Abre o painel pelo "Pagar agora", preenche o cartão e paga. */
async function payByCard() {
  fireEvent.press(await screen.findByTestId('pay-now'))
  fireEvent.press(await screen.findByTestId('mock-fill-card'))
  fireEvent.press(screen.getByTestId('card-pay'))
}

describe('painel de cartão', () => {
  it('recusa chave publicável que não seja de teste, sem abrir o SDK nem o painel', async () => {
    const outcome = await payWithCard({ ...session, publishableKey: 'pk_live_abc' })
    expect(outcome.kind).toBe('failed')
    expect(initStripe).not.toHaveBeenCalled()
    expect(useCardPayment.getState().request).toBeNull()
  })

  it('inicializa o Stripe com a chave do servidor e abre o painel', async () => {
    const pending = payWithCard(session)
    await waitFor(() => expect(useCardPayment.getState().request?.session).toEqual(session))
    expect(initStripe).toHaveBeenCalledWith(expect.objectContaining({ publishableKey: 'pk_test_abc' }))
    useCardPayment.getState().request?.resolve({ kind: 'canceled' })
    expect(await pending).toEqual({ kind: 'canceled' })
  })

  it('só paga com o cartão completo e confirma com o client secret do servidor', async () => {
    post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : order()))
    renderResult()
    fireEvent.press(await screen.findByTestId('pay-now'))
    fireEvent.press(await screen.findByTestId('card-pay'))
    expect(confirm).not.toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('mock-fill-card'))
    fireEvent.press(screen.getByTestId('card-pay'))
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith('pi_1_secret_x', 'Ana'),
    )
    expect(nextAction).not.toHaveBeenCalled()
  })

  it('3DS: o banco pede autenticação e o SDK nativo a apresenta; aprovada, o painel fecha', async () => {
    post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : order()))
    confirm.mockResolvedValueOnce({ status: 'requires_action' })
    renderResult()
    await payByCard()

    await waitFor(() => expect(nextAction).toHaveBeenCalledWith('pi_1_secret_x', 'vesti://stripe-redirect'))
    await waitFor(() => expect(screen.queryByTestId('card-payment-sheet')).toBeNull())
  })

  it('3DS cancelado pelo cliente: avisa e mantém o painel aberto', async () => {
    post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : order()))
    confirm.mockResolvedValueOnce({ status: 'requires_action' })
    nextAction.mockResolvedValueOnce({ error: { code: 'Canceled', message: 'canceled' } })
    renderResult()
    await payByCard()

    expect(await screen.findByText('A autenticação do cartão foi cancelada. Tente novamente.')).toBeTruthy()
    expect(screen.getByTestId('card-payment-sheet')).toBeTruthy()
  })

  it('recusa mostra o motivo em português e mantém o painel aberto; fechar não aprova', async () => {
    post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : order()))
    confirm.mockResolvedValueOnce({ error: { type: 'card_error', code: 'card_declined', message: 'Your card has insufficient funds.', declineCode: 'insufficient_funds' } })
    renderResult()
    await payByCard()

    expect(await screen.findByText('Saldo ou limite insuficiente. Tente outro cartão.')).toBeTruthy()
    expect(screen.getByTestId('card-payment-sheet')).toBeTruthy()

    fireEvent.press(screen.getByTestId('card-close'))
    await waitFor(() => expect(screen.queryByTestId('card-payment-sheet')).toBeNull())
    expect(await screen.findByText(/^Pagamento não concluído\./)).toBeTruthy()
    expect(screen.queryByText('Pagamento aprovado')).toBeNull()
  })
})

describe('tela de resultado do pedido', () => {
  it('mostra "Pagamento aprovado" só quando o servidor confirma', async () => {
    post.mockResolvedValue(order({ status: 'paid', paymentStatus: 'succeeded', reservedUntil: null }))
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByText('Pagamento aprovado')).toBeTruthy()
    expect(post).toHaveBeenCalledWith('/v1/orders/o1/payment/sync', undefined, { auth: true })
    expect(screen.queryByTestId('pay-now')).toBeNull()
  })

  it('SDK diz "concluído", mas o servidor ainda não confirmou: não exibe aprovado', async () => {
    post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : order()))
    renderResult()
    expect(await screen.findByText('Pedido aguardando pagamento')).toBeTruthy()

    await payByCard()

    await waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(await screen.findByText('Ainda não recebemos a confirmação do pagamento. Tente novamente.')).toBeTruthy()
    expect(screen.queryByText('Pagamento aprovado')).toBeNull()
  })

  it('pagar de novo pelo resultado: após o servidor confirmar, a tela vira aprovada', async () => {
    let paid = false
    post.mockImplementation(async (path: string) => {
      if (path.endsWith('/payment')) return session
      return paid ? order({ status: 'paid', paymentStatus: 'succeeded', reservedUntil: null }) : order()
    })
    confirm.mockImplementation(async () => {
      paid = true
      return { status: 'succeeded' }
    })
    renderResult()
    await payByCard()

    expect(await screen.findByText('Pagamento aprovado')).toBeTruthy()
  })

  it('pagamento em processamento mostra "Confirmando pagamento", sem botões de pagar/cancelar', async () => {
    post.mockResolvedValue(order({ paymentStatus: 'processing' }))
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findAllByText('Confirmando pagamento')).not.toHaveLength(0)
    expect(screen.queryByTestId('pay-now')).toBeNull()
    expect(screen.queryByTestId('cancel-order')).toBeNull()
  })

  it('cancelar pede confirmação no diálogo do app: "Manter pedido" não cancela, confirmar cancela', async () => {
    let cancelled = false
    post.mockImplementation(async (path: string) => {
      if (path.endsWith('/cancel')) cancelled = true
      return cancelled ? order({ status: 'cancelled', paymentStatus: 'canceled', reservedUntil: null }) : order()
    })
    renderWithProviders(<OrderResultScreen />)

    fireEvent.press(await screen.findByTestId('cancel-order'))
    expect(await screen.findByText('Cancelar pedido?')).toBeTruthy()
    fireEvent.press(screen.getByText('Manter pedido'))
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull())
    expect(post).not.toHaveBeenCalledWith('/v1/orders/o1/cancel', undefined, { auth: true })

    fireEvent.press(screen.getByTestId('cancel-order'))
    fireEvent.press(await screen.findByTestId('confirm-dialog-confirm'))
    expect(await screen.findByText('Pedido cancelado')).toBeTruthy()
    expect(post).toHaveBeenCalledWith('/v1/orders/o1/cancel', undefined, { auth: true })
  })

  it('pedido cancelado', async () => {
    post.mockResolvedValue(order({ status: 'cancelled', paymentStatus: 'canceled', reservedUntil: null }))
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByText('Pedido cancelado')).toBeTruthy()
  })
})
