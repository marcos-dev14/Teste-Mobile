import { describe, expect, it } from 'vitest'

import { parseEnv } from './env.js'

// Valores fictícios no formato das chaves de teste do Stripe.
const FAKE_SECRET = `sk_test_${'a'.repeat(24)}`
const FAKE_PUBLISHABLE = `pk_test_${'b'.repeat(24)}`

const base = {
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:5442/db',
  JWT_SECRET: 'x'.repeat(48),
  STRIPE_SECRET_KEY: FAKE_SECRET,
  STRIPE_PUBLISHABLE_KEY: FAKE_PUBLISHABLE,
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

  describe('Stripe somente em modo de teste', () => {
    it.each([
      ['STRIPE_SECRET_KEY', `sk_live_${'c'.repeat(24)}`],
      ['STRIPE_SECRET_KEY', `rk_live_${'c'.repeat(24)}`],
      ['STRIPE_PUBLISHABLE_KEY', `pk_live_${'c'.repeat(24)}`],
    ])('recusa %s live sem expor o valor na mensagem', (name, value) => {
      let message = ''
      try {
        parseEnv({ ...base, [name]: value })
      } catch (error) {
        message = (error as Error).message
      }
      expect(message).toMatch(name)
      expect(message).not.toContain(value)
    })

    it('exige as chaves fora dos testes, mas não no ambiente de teste (gateway falso)', () => {
      const withoutStripe: Partial<typeof base> = { ...base }
      delete withoutStripe.STRIPE_SECRET_KEY
      delete withoutStripe.STRIPE_PUBLISHABLE_KEY
      expect(() => parseEnv({ ...withoutStripe, NODE_ENV: 'development' })).toThrow(/STRIPE_SECRET_KEY/)
      expect(() => parseEnv({ ...withoutStripe, NODE_ENV: 'test' })).not.toThrow()
    })

    it('TRUST_PROXY=true é recusado em produção; lista de IPs/CIDRs é aceita', () => {
      const production = { ...base, NODE_ENV: 'production', JWT_SECRET: 'y'.repeat(48) }
      expect(() => parseEnv({ ...production, TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/)
      expect(parseEnv({ ...production, TRUST_PROXY: '10.0.0.0/8' }).TRUST_PROXY).toBe('10.0.0.0/8')
      expect(parseEnv({ ...base, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(false)
    })

    it('aceita chaves de teste e aplica a reserva padrão de 30 min', () => {
      expect(parseEnv(base)).toMatchObject({ STRIPE_SECRET_KEY: FAKE_SECRET, PAYMENT_RESERVATION_MINUTES: 30 })
    })
  })
})
