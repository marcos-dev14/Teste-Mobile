import { describe, expect, it } from 'vitest'

import { deleteExpiredRefreshTokens } from '../src/modules/auth/repository.js'
import { registerUser, setupTestApp } from './helpers.js'

const ctx = setupTestApp()

describe('retenção de refresh tokens', () => {
  it('remove só tokens expirados há mais que a carência; a sessão ativa continua funcionando', async () => {
    const alice = await registerUser(ctx.app)
    const bob = await registerUser(ctx.app)
    // Simula um token de Bob expirado há 10 dias e outro expirado há 2 dias.
    await ctx.pool.query(
      `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
       VALUES ($1, gen_random_uuid(), '\x01', now() - interval '10 days'),
              ($1, gen_random_uuid(), '\x02', now() - interval '2 days')`,
      [bob.user.id],
    )

    expect(await deleteExpiredRefreshTokens(ctx.pool, 7)).toBe(1)

    const { rows } = await ctx.pool.query<{ total: number }>('SELECT count(*)::int AS total FROM refresh_tokens')
    expect(rows[0]!.total).toBe(3)
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: alice.tokens.refreshToken },
    })
    expect(refresh.statusCode).toBe(200)
  })
})
