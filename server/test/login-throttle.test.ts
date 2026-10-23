import { describe, expect, it } from 'vitest'

import { createLoginThrottle } from '../src/lib/login-throttle.js'
import { registerUser, setupTestApp } from './helpers.js'

// Limite por IP desligado nos testes (RATE_LIMIT_ENABLED=false): isola o limite por e-mail.
const ctx = setupTestApp()

const login = (email: string, password: string) =>
  ctx.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } })

describe('limite de tentativas de login por e-mail', () => {
  it('bloqueia a conta após 5 falhas, mesmo com a senha certa, sem afetar outras contas', async () => {
    const alice = await registerUser(ctx.app)
    const bob = await registerUser(ctx.app)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login(alice.user.email, 'senhaErrada1')).statusCode).toBe(401)
    }
    const blocked = await login(alice.user.email, alice.password)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json().error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS')
    expect((await login(bob.user.email, bob.password)).statusCode).toBe(200)
  })

  it('e-mail inexistente recebe o mesmo tratamento (não revela se a conta existe)', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login('ninguem@example.com', 'senhaErrada1')).statusCode).toBe(401)
    }
    expect((await login('ninguem@example.com', 'senhaErrada1')).statusCode).toBe(429)
  })

  it('a janela expira e o sucesso zera a contagem', () => {
    let now = 0
    const throttle = createLoginThrottle({ maxFailures: 2, windowMs: 1000, now: () => now })
    throttle.recordFailure('a@x.com')
    throttle.recordFailure('a@x.com')
    expect(throttle.retryAfter('a@x.com')).toBe(1)
    now = 1001
    expect(throttle.retryAfter('a@x.com')).toBe(0)
    throttle.recordFailure('a@x.com')
    throttle.reset('a@x.com')
    throttle.recordFailure('a@x.com')
    expect(throttle.retryAfter('a@x.com')).toBe(0)
  })
})
