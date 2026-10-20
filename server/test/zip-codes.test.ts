import { describe, expect, it, vi } from 'vitest'

import { ZipCodeLookupUnavailable } from '../src/modules/addresses/zip-code.js'
import { registerUser, setupTestApp } from './helpers.js'

const lookup = vi.fn(async (digits: string) => {
  if (digits === '01310100') {
    return { zipCode: '01310-100', street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' as const }
  }
  if (digits === '00000000') throw new ZipCodeLookupUnavailable()
  return null
})

const ctx = setupTestApp({}, { zipCodeLookup: lookup })

const url = (zipCode: string) => `/v1/addresses/zip-codes/${zipCode}`

describe('consulta de CEP (rota)', () => {
  it('exige autenticação', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: url('01310100') })).statusCode).toBe(401)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('devolve o endereço sugerido e aceita CEP com hífen', async () => {
    const { auth } = await registerUser(ctx.app)
    const response = await ctx.app.inject({ method: 'GET', url: url('01310-100'), headers: auth })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      zipCode: '01310-100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    })
    expect(lookup).toHaveBeenLastCalledWith('01310100')
  })

  it('CEP com tamanho errado → 400 sem consultar o provedor', async () => {
    const { auth } = await registerUser(ctx.app)
    lookup.mockClear()
    const response = await ctx.app.inject({ method: 'GET', url: url('1234'), headers: auth })
    expect(response.statusCode).toBe(400)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('CEP inexistente → 404 e provedores fora → 503, ambos com código próprio', async () => {
    const { auth } = await registerUser(ctx.app)
    const missing = await ctx.app.inject({ method: 'GET', url: url('99999999'), headers: auth })
    expect(missing.statusCode).toBe(404)
    expect(missing.json().error.code).toBe('ZIP_CODE_NOT_FOUND')

    const down = await ctx.app.inject({ method: 'GET', url: url('00000000'), headers: auth })
    expect(down.statusCode).toBe(503)
    expect(down.json().error.code).toBe('ZIP_CODE_LOOKUP_UNAVAILABLE')
  })
})
