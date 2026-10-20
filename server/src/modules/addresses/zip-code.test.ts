import type { FastifyBaseLogger } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { maskLoggedUrl } from '../../app.js'
import { createZipCodeLookup, ZipCodeLookupUnavailable } from './zip-code.js'

const VIACEP_OK = { cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }
const BRASILAPI_OK = { cep: '01310100', street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' }

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

function timeoutError() {
  const error = new Error('The operation was aborted due to timeout')
  error.name = 'TimeoutError'
  return error
}

function setup(handlers: { viacep?: () => Promise<Response>; brasilapi?: () => Promise<Response> }) {
  const fetch = vi.fn(async (url: string) => {
    const handler = url.includes('viacep') ? handlers.viacep : handlers.brasilapi
    if (!handler) throw new Error('provedor não configurado')
    return handler()
  })
  const log = { warn: vi.fn() } as unknown as FastifyBaseLogger & { warn: ReturnType<typeof vi.fn> }
  let clock = 0
  const lookup = createZipCodeLookup({ log, fetch, now: () => clock })
  return { lookup, fetch, log, advance: (ms: number) => (clock += ms) }
}

describe('consulta de CEP', () => {
  it('normaliza a resposta do ViaCEP sem consultar o fallback', async () => {
    const { lookup, fetch } = setup({ viacep: async () => json(200, VIACEP_OK) })
    await expect(lookup('01310100')).resolves.toEqual({
      zipCode: '01310-100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toBe('https://viacep.com.br/ws/01310100/json/')
  })

  it('usa a BrasilAPI quando o ViaCEP falha ou expira, sem registrar o CEP no log', async () => {
    const { lookup, log } = setup({
      viacep: async () => Promise.reject(timeoutError()),
      brasilapi: async () => json(200, BRASILAPI_OK),
    })
    await expect(lookup('01310100')).resolves.toMatchObject({ city: 'São Paulo', state: 'SP' })
    expect(log.warn).toHaveBeenCalledWith({ provider: 'viacep', reason: 'timeout' }, 'zip code provider failed')
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('01310')
  })

  it('CEP inexistente nos dois provedores → null', async () => {
    const { lookup } = setup({
      viacep: async () => json(200, { erro: 'true' }),
      brasilapi: async () => json(404, { message: 'CEP não encontrado' }),
    })
    await expect(lookup('99999999')).resolves.toBeNull()
  })

  it('nenhum provedor respondeu → indisponível (e a falha não é guardada em cache)', async () => {
    const { lookup, fetch } = setup({
      viacep: async () => json(503, {}),
      brasilapi: async () => Promise.reject(new TypeError('fetch failed')),
    })
    await expect(lookup('01310100')).rejects.toBeInstanceOf(ZipCodeLookupUnavailable)
    await expect(lookup('01310100')).rejects.toBeInstanceOf(ZipCodeLookupUnavailable)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('não confia no provedor: UF desconhecida ou cidade ausente viram "não encontrado"; textos são limpos e limitados', async () => {
    const { lookup } = setup({
      viacep: async () =>
        json(200, { logradouro: `  Rua   ${'x'.repeat(300)}`, bairro: '', localidade: '  Campinas ', uf: 'sp' }),
    })
    const result = await lookup('13010000')
    expect(result?.street?.startsWith('Rua x')).toBe(true)
    expect(result?.street?.length).toBeLessThanOrEqual(120)
    expect(result).toMatchObject({ neighborhood: null, city: 'Campinas', state: 'SP' })

    const invalid = setup({
      viacep: async () => json(200, { logradouro: 'Rua', localidade: 'Lugar', uf: 'XX' }),
      brasilapi: async () => json(200, { street: 'Rua', city: null, state: 'SP' }),
    })
    await expect(invalid.lookup('12345678')).resolves.toBeNull()
  })

  it('guarda em cache e agrupa consultas simultâneas do mesmo CEP', async () => {
    const { lookup, fetch, advance } = setup({ viacep: async () => json(200, VIACEP_OK) })
    await Promise.all([lookup('01310100'), lookup('01310100'), lookup('01310100')])
    await lookup('01310100')
    expect(fetch).toHaveBeenCalledTimes(1)

    advance(24 * 60 * 60_000 + 1)
    await lookup('01310100')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('mascara o CEP na URL registrada pelo logger', () => {
    expect(maskLoggedUrl('/v1/addresses/zip-codes/01310100')).toBe('/v1/addresses/zip-codes/[redacted]')
    expect(maskLoggedUrl('/v1/addresses/zip-codes/01310-100?x=1')).toBe('/v1/addresses/zip-codes/[redacted]?x=1')
    expect(maskLoggedUrl('/v1/products?search=cal')).toBe('/v1/products?search=cal')
  })
})
