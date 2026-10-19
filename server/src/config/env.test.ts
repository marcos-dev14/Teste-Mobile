import { describe, expect, it } from 'vitest'

import { parseEnv } from './env.js'

const base = {
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5442/db',
  JWT_SECRET: 'x'.repeat(48),
}

describe('parseEnv', () => {
  it('aplica padrões e converte tipos', () => {
    const env = parseEnv({ ...base, PORT: '4000', CORS_ORIGINS: 'http://a.com, http://b.com', RATE_LIMIT_ENABLED: 'false' })
    expect(env).toMatchObject({ PORT: 4000, CORS_ORIGINS: ['http://a.com', 'http://b.com'], RATE_LIMIT_ENABLED: false })
  })

  it('recusa segredo curto', () => {
    expect(() => parseEnv({ ...base, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/)
  })

  it('recusa o segredo de exemplo em produção', () => {
    const example = 'troque-por-um-segredo-aleatorio-com-no-minimo-32-caracteres'
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: example })).toThrow(/exemplo/)
    expect(() => parseEnv({ ...base, NODE_ENV: 'development', JWT_SECRET: example })).not.toThrow()
  })
})
