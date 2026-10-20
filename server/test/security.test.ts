import { createSigner } from 'fast-jwt'
import { describe, expect, it } from 'vitest'

import { registerUser, setupTestApp } from './helpers.js'

describe('segurança da API', () => {
  const ctx = setupTestApp()

  it('rejeita tokens adulterados, de outro emissor, sem assinatura ou do tipo errado', async () => {
    const user = await registerUser(ctx.app)
    const [header, payload, signature] = user.tokens.accessToken.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload!, 'base64url').toString()), sub: '00000000-0000-4000-8000-000000000000' }),
    ).toString('base64url')

    const wrongSecret = createSigner({ key: 'outro-segredo-com-mais-de-32-caracteres!!', iss: 'mp-ecommerce-api', aud: 'mp-ecommerce-app' })
    const sameSecretWrongAudience = createSigner({ key: ctx.env.JWT_SECRET, iss: 'mp-ecommerce-api', aud: 'outro' })
    const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')

    const tokens = [
      `${header}.${forgedPayload}.${signature}`,
      wrongSecret({ sub: user.user.id, typ: 'access' }),
      sameSecretWrongAudience({ sub: user.user.id, typ: 'access' }),
      `${unsignedHeader}.${payload}.`,
      ctx.app.jwt.sign({ sub: user.user.id, typ: 'refresh' as 'access' }),
      ctx.app.jwt.sign({ sub: user.user.id, typ: 'access' }, { expiresIn: -10 }),
    ]
    for (const token of tokens) {
      const response = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } })
      expect(response.statusCode).toBe(401)
    }
  })

  it('erros não vazam detalhes internos', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"email": ',
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toEqual({
      code: 'BAD_REQUEST',
      message: 'JSON inválido.',
      requestId: expect.any(String),
    })
    expect(response.body).not.toMatch(/stack|at .*\.ts|SELECT/i)
  })

  it('limita o tamanho do corpo', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'a@example.com', password: 'x'.repeat(70 * 1024) },
    })
    expect(response.statusCode).toBe(413)
  })

  it('envia cabeçalhos de segurança e restringe CORS às origens configuradas', async () => {
    const allowed = await ctx.app.inject({
      method: 'GET',
      url: '/v1/products',
      headers: { origin: 'http://localhost:8081' },
    })
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8081')
    expect(allowed.headers['x-content-type-options']).toBe('nosniff')
    expect(allowed.headers['x-request-id']).toEqual(expect.any(String))

    const denied = await ctx.app.inject({ method: 'GET', url: '/v1/products', headers: { origin: 'https://evil.example' } })
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('rate limiting', () => {
  const ctx = setupTestApp({ RATE_LIMIT_ENABLED: 'true' })

  it('bloqueia força bruta no login após 10 tentativas por minuto', async () => {
    const statuses: number[] = []
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'alvo@example.com', password: `tentativa${attempt}` },
      })
      statuses.push(response.statusCode)
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true)
    expect(statuses.slice(10)).toEqual([429, 429])
  })
})
