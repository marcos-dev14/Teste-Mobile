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

  it('grava número e bairro, normaliza a UF e exige ambos em novos endereços', async () => {
    const alice = await registerUser(ctx.app)
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/v1/addresses',
      headers: alice.auth,
      payload: { ...validAddress, state: ' sp ', number: 'S/N' },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({ number: 'S/N', neighborhood: 'Bela Vista', state: 'SP' })

    const withoutDetails: Partial<typeof validAddress> = { ...validAddress }
    delete withoutDetails.number
    delete withoutDetails.neighborhood
    const missing = await ctx.app.inject({ method: 'POST', url: '/v1/addresses', headers: alice.auth, payload: withoutDetails })
    expect(missing.statusCode).toBe(400)
    const paths = missing.json().error.details.map((detail: { path: string }) => detail.path)
    expect(paths).toEqual(expect.arrayContaining(['body.number', 'body.neighborhood']))
  })

  it('rejeita UF inexistente ou por extenso', async () => {
    const alice = await registerUser(ctx.app)
    for (const state of ['XX', 'São Paulo']) {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/v1/addresses',
        headers: alice.auth,
        payload: { ...validAddress, state },
      })
      expect(response.statusCode).toBe(400)
    }
  })

  it('endereços anteriores à migration 0002 continuam legíveis (número e bairro nulos)', async () => {
    const alice = await registerUser(ctx.app)
    await ctx.pool.query(
      `INSERT INTO addresses (user_id, full_name, address_line1, city, state, zip_code, country)
       VALUES ($1, 'Pessoa Antiga', 'Rua Velha, 10', 'Recife', 'Pernambuco', '50000-000', 'Brasil')`,
      [alice.user.id],
    )
    const list = await ctx.app.inject({ method: 'GET', url: '/v1/addresses', headers: alice.auth })
    expect(list.statusCode).toBe(200)
    expect(list.json().data[0]).toMatchObject({ addressLine1: 'Rua Velha, 10', number: null, neighborhood: null })
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
