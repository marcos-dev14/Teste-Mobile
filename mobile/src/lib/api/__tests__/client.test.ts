import { api, setAuthBridge } from '../client'
import { ApiError } from '../errors'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('api client', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    setAuthBridge(null)
  })

  it('converte o corpo de erro padrão em ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'INSUFFICIENT_STOCK', message: 'Estoque insuficiente.', requestId: 'r1' } }),
    )
    await expect(api.post('/v1/orders', {})).rejects.toMatchObject({
      kind: 'http',
      status: 409,
      code: 'INSUFFICIENT_STOCK',
      requestId: 'r1',
    })
  })

  it('falha de rede vira ApiError do tipo network', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))
    const error = await api.get('/v1/products').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'network', code: 'NETWORK_ERROR' })
  })

  it('monta querystring ignorando valores vazios', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))
    await api.get('/v1/products', { query: { search: 'calça jeans', sort: 'featured', page: undefined } })
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/v1\/products\?search=cal%C3%A7a%20jeans&sort=featured$/)
  })

  it('em 401 renova o token uma vez e repete a requisição', async () => {
    const refresh = jest.fn(async () => 'novo-token')
    setAuthBridge({ getAccessToken: () => 'token-expirado', refreshAccessToken: refresh })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'INVALID_TOKEN', message: 'x', requestId: 'r' } }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1' }))

    await expect(api.get('/v1/me', { auth: true })).resolves.toEqual({ id: 'u1' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[1]![1].headers.Authorization).toBe('Bearer novo-token')
  })

  it('não envia requisição autenticada sem sessão', async () => {
    setAuthBridge({ getAccessToken: () => null, refreshAccessToken: async () => null })
    await expect(api.get('/v1/me', { auth: true })).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
