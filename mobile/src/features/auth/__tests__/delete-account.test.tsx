import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import DeleteAccountScreen from '@/app/account/delete'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { renderWithProviders } from '@/test-utils'

import { session, useSession } from '../session-store'

jest.mock('@/lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthBridge: jest.fn(),
}))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false },
  usePathname: () => '/account/delete',
  Redirect: () => null,
}))

const post = api.post as jest.Mock
const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } }

beforeEach(() => {
  jest.clearAllMocks()
  useSession.setState({ status: 'authenticated', user: { id: 'u1', name: 'Ana', email: 'a@b.c', createdAt: '' } })
})

/** Preenche a senha, toca em excluir e confirma no diálogo. */
async function submit(password = 'senhaSegura1') {
  fireEvent.changeText(screen.getByTestId('delete-password'), password)
  fireEvent.press(screen.getByTestId('delete-account'))
  fireEvent.press(await screen.findByTestId('confirm-dialog-confirm'))
}

describe('excluir conta', () => {
  it('sem senha não abre o diálogo nem chama a API', async () => {
    renderWithProviders(<DeleteAccountScreen />)
    fireEvent.press(screen.getByTestId('delete-account'))
    expect(await screen.findByText('Informe sua senha para confirmar.')).toBeTruthy()
    expect(screen.queryByTestId('confirm-dialog')).toBeNull()
    expect(post).not.toHaveBeenCalled()
  })

  it('"Manter conta" no diálogo não exclui', async () => {
    renderWithProviders(<DeleteAccountScreen />)
    fireEvent.changeText(screen.getByTestId('delete-password'), 'senhaSegura1')
    fireEvent.press(screen.getByTestId('delete-account'))
    fireEvent.press(await screen.findByText('Manter conta'))
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull())
    expect(post).not.toHaveBeenCalled()
  })

  it('senha incorreta aparece no campo e mantém a sessão', async () => {
    post.mockRejectedValueOnce(new ApiError('http', 403, 'INVALID_PASSWORD', 'Senha incorreta.'))
    renderWithProviders(<DeleteAccountScreen />)
    await submit('errada123')

    expect(await screen.findByText('Senha incorreta.')).toBeTruthy()
    expect(post).toHaveBeenCalledWith('/v1/me/delete', { password: 'errada123' }, { auth: true })
    expect(useSession.getState().status).toBe('authenticated')
  })

  it('pedido em andamento: mostra o motivo e o atalho para os pedidos', async () => {
    const message = 'Você tem pedidos em andamento. Cancele os que aguardam pagamento ou aguarde a entrega para excluir a conta.'
    post.mockRejectedValueOnce(new ApiError('http', 409, 'ACCOUNT_HAS_ORDERS_IN_PROGRESS', message))
    renderWithProviders(<DeleteAccountScreen />)
    await submit()

    expect(await screen.findByTestId('delete-blocked')).toHaveTextContent(message)
    expect(screen.getByText('Ver meus pedidos')).toBeTruthy()
  })

  it('sucesso: encerra a sessão no aparelho e volta ao perfil', async () => {
    post.mockResolvedValueOnce(undefined)
    const signOut = jest.spyOn(session, 'signOut').mockResolvedValue()
    renderWithProviders(<DeleteAccountScreen />)
    await submit()

    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(router.replace).toHaveBeenCalledWith('/profile')
    expect(await screen.findByText('Sua conta foi excluída.')).toBeTruthy()
  })
})
