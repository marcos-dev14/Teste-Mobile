import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import * as Clipboard from 'expo-clipboard'

import CheckoutPaymentScreen from '@/app/checkout/payment'
import OrderResultScreen from '@/app/checkout/success'
import { useSession } from '@/features/auth/session-store'
import { useCheckout } from '@/features/checkout/store'
import { api } from '@/lib/api/client'
import type { OrderDetail, PaymentSession } from '@/lib/api/types'
import { renderWithProviders } from '@/test-utils'

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }))
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
}))
jest.mock('expo-linking', () => ({ createURL: (path: string) => `vesti://${path}` }))
jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthBridge: jest.fn(),
}))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false },
  useLocalSearchParams: () => ({ orderId: 'o1', number: '1001' }),
  usePathname: () => '/checkout/payment',
  useIsFocused: () => true,
  Redirect: () => null,
}))

const get = api.get as jest.Mock
const post = api.post as jest.Mock
const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } }

function order(overrides: Partial<OrderDetail>): OrderDetail {
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
    createdAt: '2026-10-21T18:00:00.000Z',
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
  pix: {
    qrCodeData: '00020101pix-copia-e-cola',
    qrCodeImageUrl: 'https://qr.stripe.com/test.png',
    hostedInstructionsUrl: 'https://payments.stripe.com/qr/x',
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  },
}

const boletoSession: PaymentSession = {
  method: 'boleto',
  paymentIntentId: 'pi_2',
  amountCents: 2999,
  currency: 'brl',
  boleto: {
    number: '01010101010101010101010101010101010101010101010',
    pdfUrl: 'https://payments.stripe.com/boleto/x.pdf',
    hostedVoucherUrl: 'https://payments.stripe.com/boleto/x',
    expiresAt: '2026-10-24T02:59:59.000Z',
  },
}

/** Simula a API: `/payment/sync` devolve o pedido; `/payment` devolve a sessão. */
function serve(current: () => OrderDetail, session: PaymentSession) {
  post.mockImplementation(async (path: string) => (path.endsWith('/payment') ? session : current()))
}

beforeEach(() => {
  jest.clearAllMocks()
  useSession.setState({ status: 'authenticated', user: { id: 'u1', name: 'Ana', email: 'a@b.c', createdAt: '' } })
  useCheckout.getState().reset()
})

describe('Pix', () => {
  it('mostra o QR Code, copia o código e não oferece "pago" antes da confirmação do servidor', async () => {
    serve(() => order({}), pixSession)
    renderWithProviders(<OrderResultScreen />)

    expect(await screen.findByTestId('pix-qr')).toBeTruthy()
    expect(screen.getAllByText('Pague com Pix').length).toBeGreaterThan(0)
    expect(screen.queryByText('Pagamento aprovado')).toBeNull()

    fireEvent.press(screen.getByTestId('copy-pix'))
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith('00020101pix-copia-e-cola'))
    expect(await screen.findByText('Código Pix copiado.')).toBeTruthy()
  })

  it('mostra a contagem regressiva até o Pix vencer', async () => {
    serve(() => order({}), pixSession)
    renderWithProviders(<OrderResultScreen />)
    const countdown = await screen.findByTestId('pix-countdown')
    // 30 min a partir da criação da sessão: "30:00" ou "29:5x", conforme o tempo do teste.
    expect(countdown).toHaveTextContent(/(30:00|29:\d{2})/)
  })

  it('prazo esgotado: esconde o QR Code e avisa que o pedido será cancelado', async () => {
    const expired = { ...pixSession, pix: { ...(pixSession as Extract<PaymentSession, { method: 'pix' }>).pix, expiresAt: '2000-01-01T00:00:00.000Z' } }
    serve(() => order({}), expired)
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByTestId('pix-expired')).toHaveTextContent(/cancelando o pedido/)
    expect(screen.queryByTestId('pix-qr')).toBeNull()
    expect(screen.queryByTestId('copy-pix')).toBeNull()
  })

  it('quando o servidor confirma o pagamento, a tela vira "Pagamento aprovado"', async () => {
    let paid = false
    serve(() => (paid ? order({ status: 'paid', paymentStatus: 'succeeded', reservedUntil: null }) : order({})), pixSession)
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByTestId('pix-qr')).toBeTruthy()

    // O cliente pagou no banco: a próxima consulta periódica (5 s para Pix) traz o status do servidor.
    paid = true
    expect(await screen.findByText('Pagamento aprovado', undefined, { timeout: 8_000 })).toBeTruthy()
    expect(screen.queryByTestId('pix-qr')).toBeNull()
  }, 15_000)

  it('Pix expirado: explica a falha e só gera um novo com CPF/CNPJ válido', async () => {
    serve(() => order({ paymentStatus: 'requires_payment_method', paymentFailureCode: 'payment_intent_payment_attempt_failed' }), pixSession)
    renderWithProviders(<OrderResultScreen />)

    expect(await screen.findByTestId('payment-failure')).toHaveTextContent(/Pix anterior expirou/)
    fireEvent.changeText(screen.getByTestId('tax-id'), '52998224724')
    fireEvent.press(screen.getByTestId('generate-payment'))
    expect(await screen.findByText('CPF ou CNPJ inválido.')).toBeTruthy()
    expect(post).not.toHaveBeenCalledWith('/v1/orders/o1/payment', expect.anything(), expect.anything())

    fireEvent.changeText(screen.getByTestId('tax-id'), '52998224725')
    expect(screen.getByTestId('tax-id').props.value).toBe('529.982.247-25')
    fireEvent.press(screen.getByTestId('generate-payment'))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/v1/orders/o1/payment', { taxId: '529.982.247-25' }, { auth: true }),
    )
  })
})

describe('boleto', () => {
  it('mostra número, vencimento, copia o código e não permite cancelar o boleto emitido', async () => {
    serve(() => order({ paymentMethod: 'boleto' }), boletoSession)
    renderWithProviders(<OrderResultScreen />)

    expect((await screen.findAllByText('Boleto gerado')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('boleto-number')).toHaveTextContent(/^01010 10101/)
    fireEvent.press(screen.getByTestId('copy-boleto'))
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(boletoSession.boleto.number))
    expect(screen.queryByTestId('cancel-order')).toBeNull()
  })

  it('pedido expirado (boleto vencido) mostra o estado final', async () => {
    serve(() => order({ paymentMethod: 'boleto', status: 'expired', paymentStatus: 'canceled', reservedUntil: null }), boletoSession)
    renderWithProviders(<OrderResultScreen />)
    expect(await screen.findByText('Pedido expirado')).toBeTruthy()
  })
})

describe('escolha da forma de pagamento', () => {
  it('oferece só os métodos habilitados no servidor', async () => {
    get.mockResolvedValue({ data: ['credit_card'], testMode: true })
    renderWithProviders(<CheckoutPaymentScreen />)
    expect(await screen.findByTestId('method-credit_card')).toBeTruthy()
    expect(screen.queryByTestId('method-pix')).toBeNull()
    expect(screen.queryByTestId('method-boleto')).toBeNull()
  })

  it('Pix pede CPF/CNPJ válido antes de revisar o pedido; o valor fica só em memória', async () => {
    get.mockResolvedValue({ data: ['credit_card', 'pix', 'boleto'], testMode: true })
    renderWithProviders(<CheckoutPaymentScreen />)
    fireEvent.press(await screen.findByTestId('method-pix'))

    fireEvent.press(screen.getByTestId('review-order'))
    expect(await screen.findByText('CPF ou CNPJ inválido.')).toBeTruthy()
    expect(router.push).not.toHaveBeenCalled()

    fireEvent.changeText(screen.getByTestId('tax-id'), '000.000.000-00')
    fireEvent.press(screen.getByTestId('review-order'))
    expect(router.push).toHaveBeenCalledWith('/checkout/review')
    expect(useCheckout.getState()).toMatchObject({ paymentMethod: 'pix', taxId: '000.000.000-00' })

    useCheckout.getState().reset()
    expect(useCheckout.getState().taxId).toBe('')
  })
})
