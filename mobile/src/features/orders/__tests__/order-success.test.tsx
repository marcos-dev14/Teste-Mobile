import { screen } from '@testing-library/react-native'

import OrderSuccessScreen from '@/app/checkout/success'
import { renderWithProviders } from '@/test-utils'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false },
  useLocalSearchParams: () => ({ orderId: 'o1', number: '1001' }),
}))

describe('confirmação do pedido', () => {
  it('não afirma pagamento nem preparação sem confirmação do servidor', () => {
    renderWithProviders(<OrderSuccessScreen />)
    expect(screen.getByText('Pedido recebido')).toBeTruthy()
    expect(screen.getByText(/nenhuma cobrança foi feita/)).toBeTruthy()
    expect(screen.queryByText(/confirmado|em preparação|pago/i)).toBeNull()
  })
})
