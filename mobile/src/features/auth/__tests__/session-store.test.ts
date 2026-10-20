import * as SecureStore from 'expo-secure-store'

import { ApiError } from '@/lib/api/errors'

import { authApi } from '../api'
import { refreshAccessToken, session, useSession } from '../session-store'

jest.mock('../api', () => ({
  authApi: { login: jest.fn(), register: jest.fn(), refresh: jest.fn(), logout: jest.fn(), me: jest.fn() },
}))

const mocked = authApi as jest.Mocked<typeof authApi>
const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', createdAt: '2026-01-01T00:00:00.000Z' }
const tokens = (n: number) => ({ tokenType: 'Bearer' as const, accessToken: `access-${n}`, expiresIn: 900, refreshToken: `refresh-${n}` })

describe('session store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(SecureStore as unknown as { __reset: () => void }).__reset()
    useSession.setState({ status: 'loading', user: null, accessToken: null })
  })

  it('guarda o refresh token no SecureStore e o access token só em memória', async () => {
    mocked.login.mockResolvedValue({ user, tokens: tokens(1) })
    await session.signIn({ email: 'ana@example.com', password: 'x' })
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access-1' })
    const stored = JSON.parse((await SecureStore.getItemAsync('vesti.session.v1'))!)
    expect(stored).toEqual({ refreshToken: 'refresh-1', user })
    expect(JSON.stringify(stored)).not.toContain('access-1')
  })

  it('restaura a sessão sem rede no bootstrap', async () => {
    await SecureStore.setItemAsync('vesti.session.v1', JSON.stringify({ refreshToken: 'r', user }))
    await session.bootstrap()
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', user, accessToken: null })
    expect(mocked.refresh).not.toHaveBeenCalled()
  })

  it('refresh concorrente usa uma única requisição (single-flight)', async () => {
    await SecureStore.setItemAsync('vesti.session.v1', JSON.stringify({ refreshToken: 'refresh-0', user }))
    mocked.refresh.mockImplementation(async () => ({ tokens: tokens(2) }))
    const results = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()])
    expect(results).toEqual(['access-2', 'access-2', 'access-2'])
    expect(mocked.refresh).toHaveBeenCalledTimes(1)
  })

  it('refresh rejeitado (401) encerra a sessão; falha de rede não', async () => {
    await SecureStore.setItemAsync('vesti.session.v1', JSON.stringify({ refreshToken: 'r', user }))
    mocked.refresh.mockRejectedValueOnce(new ApiError('network', 0, 'NETWORK_ERROR', 'x'))
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError)
    expect(await SecureStore.getItemAsync('vesti.session.v1')).not.toBeNull()

    mocked.refresh.mockRejectedValueOnce(new ApiError('http', 401, 'INVALID_REFRESH_TOKEN', 'x'))
    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(useSession.getState().status).toBe('anonymous')
    expect(await SecureStore.getItemAsync('vesti.session.v1')).toBeNull()
  })

  it('refresh que termina depois do logout não ressuscita a sessão', async () => {
    await SecureStore.setItemAsync('vesti.session.v1', JSON.stringify({ refreshToken: 'r', user }))
    let resolveRefresh: (value: { tokens: ReturnType<typeof tokens> }) => void = () => {}
    mocked.refresh.mockImplementation(() => new Promise((resolve) => (resolveRefresh = resolve)))
    mocked.logout.mockResolvedValue(undefined)

    const pending = refreshAccessToken()
    await new Promise<void>((resolve) => setImmediate(resolve))
    await session.signOut()
    resolveRefresh({ tokens: tokens(9) })

    await expect(pending).resolves.toBeNull()
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', accessToken: null })
    expect(await SecureStore.getItemAsync('vesti.session.v1')).toBeNull()
  })

  it('logout limpa o aparelho mesmo se o servidor estiver fora', async () => {
    mocked.login.mockResolvedValue({ user, tokens: tokens(1) })
    mocked.logout.mockRejectedValue(new ApiError('network', 0, 'NETWORK_ERROR', 'x'))
    await session.signIn({ email: 'a', password: 'b' })
    await session.signOut()
    expect(useSession.getState()).toMatchObject({ status: 'anonymous', user: null, accessToken: null })
    expect(await SecureStore.getItemAsync('vesti.session.v1')).toBeNull()
  })
})
