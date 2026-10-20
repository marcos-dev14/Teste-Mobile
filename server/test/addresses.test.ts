import { describe, expect, it } from 'vitest'

import { MAX_ADDRESSES_PER_USER } from '../src/modules/addresses/schemas.js'
import { createAddress, registerUser, setupTestApp, validAddress } from './helpers.js'

const ctx = setupTestApp()

describe('endereços', () => {
  it('exige autenticação', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/addresses' })).statusCode).toBe(401)
    expect(
      (await ctx.app.inject({ method: 'POST', url: '/v1/addresses', payload: validAddress })).statusCode,
    ).toBe(401)
  })

  it('cria normalizando o CEP e lista apenas os do próprio usuário', async () => {
    const alice = await registerUser(ctx.app)
    const bob = await registerUser(ctx.app)
    const created = await ctx.app.inject({ method: 'POST', url: '/v1/addresses', headers: alice.auth, payload: validAddress })
    expect(created.statusCode).toBe(201)
    expect(created.json().zipCode).toBe('01310-100')

    const aliceList = (await ctx.app.inject({ method: 'GET', url: '/v1/addresses', headers: alice.auth })).json()
    const bobList = (await ctx.app.inject({ method: 'GET', url: '/v1/addresses', headers: bob.auth })).json()
    expect(aliceList.data).toHaveLength(1)
    expect(bobList.data).toHaveLength(0)
  })

  it('não aceita userId no corpo (identidade vem do token)', async () => {
    const alice = await registerUser(ctx.app)
    const bob = await registerUser(ctx.app)
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/addresses',
      headers: alice.auth,
      payload: { ...validAddress, userId: bob.user.id },
    })
    expect(response.statusCode).toBe(400)
  })

  it('valida CEP', async () => {
    const alice = await registerUser(ctx.app)
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/addresses',
      headers: alice.auth,
      payload: { ...validAddress, zipCode: '123' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('não remove endereço de outro usuário (404)', async () => {
    const alice = await registerUser(ctx.app)
    const bob = await registerUser(ctx.app)
    const address = await createAddress(ctx.app, alice.auth)

    const attack = await ctx.app.inject({ method: 'DELETE', url: `/v1/addresses/${address.id}`, headers: bob.auth })
    expect(attack.statusCode).toBe(404)

    const own = await ctx.app.inject({ method: 'DELETE', url: `/v1/addresses/${address.id}`, headers: alice.auth })
    expect(own.statusCode).toBe(204)
  })

  it('respeita o limite por usuário mesmo com requisições simultâneas', async () => {
    const alice = await registerUser(ctx.app)
    const responses = await Promise.all(
      Array.from({ length: MAX_ADDRESSES_PER_USER + 5 }, () =>
        ctx.app.inject({ method: 'POST', url: '/v1/addresses', headers: alice.auth, payload: validAddress }),
      ),
    )
    expect(responses.filter((response) => response.statusCode === 201)).toHaveLength(MAX_ADDRESSES_PER_USER)
    expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(5)
  })
})
