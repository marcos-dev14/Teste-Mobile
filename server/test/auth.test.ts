import { describe, expect, it } from 'vitest'

import { registerUser, setupTestApp } from './helpers.js'

const ctx = setupTestApp()

describe('auth', () => {
  it('cadastra, devolve tokens e nunca expõe o hash da senha', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { name: '  Ana  ', email: 'Ana@Example.com ', password: 'senhaSegura1' },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.user).toMatchObject({ name: 'Ana', email: 'ana@example.com' })
    expect(body.tokens.tokenType).toBe('Bearer')
    expect(response.body).not.toMatch(/scrypt|password/i)

    const { rows } = await ctx.pool.query('SELECT password_hash FROM users WHERE email = $1', ['ana@example.com'])
    expect(rows[0].password_hash).toMatch(/^scrypt\$/)
  })

  it('rejeita e-mail duplicado sem diferenciar maiúsculas', async () => {
    await registerUser(ctx.app, { email: 'dup@example.com' })
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { name: 'Outra', email: 'DUP@example.com', password: 'senhaSegura1' },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('EMAIL_IN_USE')
  })

  it.each([
    ['curta', 'abc1'],
    ['sem número', 'somenteletras'],
    ['sem letra', '12345678'],
  ])('aplica a política de senha no servidor (%s)', async (_label, password) => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { name: 'Teste', email: 'politica@example.com', password },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('login com credenciais válidas e mensagem genérica para inválidas', async () => {
    const user = await registerUser(ctx.app)
    const ok = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.user.email.toUpperCase(), password: user.password },
    })
    expect(ok.statusCode).toBe(200)

    const wrongPassword = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.user.email, password: 'outraSenha9' },
    })
    const unknownEmail = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'naoexiste@example.com', password: 'outraSenha9' },
    })
    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(401)
    expect(wrongPassword.json().error.message).toBe(unknownEmail.json().error.message)
  })

  it('GET /me exige token válido', async () => {
    const user = await registerUser(ctx.app)
    const me = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: user.auth })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({ id: user.user.id, email: user.user.email })

    expect((await ctx.app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401)
  })

  it('rotaciona o refresh token e o anterior deixa de valer', async () => {
    const user = await registerUser(ctx.app)
    const first = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: user.tokens.refreshToken },
    })
    expect(first.statusCode).toBe(200)
    const rotated = first.json().tokens
    expect(rotated.refreshToken).not.toBe(user.tokens.refreshToken)

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${rotated.accessToken}` },
    })
    expect(me.statusCode).toBe(200)
  })

  it('reuso de refresh token já rotacionado revoga toda a família', async () => {
    const user = await registerUser(ctx.app)
    const rotated = (
      await ctx.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: user.tokens.refreshToken } })
    ).json().tokens

    // Atacante reapresenta o token antigo depois da janela de tolerância.
    await ctx.pool.query("UPDATE refresh_tokens SET revoked_at = now() - interval '5 minutes' WHERE revoked_at IS NOT NULL")
    const reuse = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: user.tokens.refreshToken },
    })
    expect(reuse.statusCode).toBe(401)

    // O token legítimo mais recente também foi revogado.
    const legit = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: rotated.refreshToken },
    })
    expect(legit.statusCode).toBe(401)
  })

  it('refresh duplicado dentro da janela de tolerância não derruba a sessão', async () => {
    const user = await registerUser(ctx.app)
    const refresh = () =>
      ctx.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: user.tokens.refreshToken } })
    // Ex.: o cliente perdeu a resposta (timeout) e repetiu com o mesmo token.
    const [first, second] = await Promise.all([refresh(), refresh()])
    expect([first.statusCode, second.statusCode]).toEqual([200, 200])

    // Passada a janela, reapresentar o token original volta a ser reuso e revoga a família.
    await ctx.pool.query("UPDATE refresh_tokens SET revoked_at = now() - interval '5 minutes' WHERE revoked_at IS NOT NULL")
    expect((await refresh()).statusCode).toBe(401)
    const latest = [first, second].map((response) => response.json().tokens.refreshToken as string)
    for (const refreshToken of latest) {
      const response = await ctx.app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } })
      expect(response.statusCode).toBe(401)
    }
  })

  it('logout revoga o refresh token', async () => {
    const user = await registerUser(ctx.app)
    const logout = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      payload: { refreshToken: user.tokens.refreshToken },
    })
    expect(logout.statusCode).toBe(204)
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: user.tokens.refreshToken },
    })
    expect(refresh.statusCode).toBe(401)
  })

  it('refresh token expirado é rejeitado', async () => {
    const user = await registerUser(ctx.app)
    await ctx.pool.query("UPDATE refresh_tokens SET expires_at = now() - interval '1 second'")
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: user.tokens.refreshToken },
    })
    expect(refresh.statusCode).toBe(401)
    expect(refresh.json().error.code).toBe('INVALID_REFRESH_TOKEN')
  })
})
