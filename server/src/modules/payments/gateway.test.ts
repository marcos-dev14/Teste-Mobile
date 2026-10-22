import { describe, expect, it } from 'vitest'

import { createStripeGateway, scrubProviderMessage, WebhookNotConfigured } from './gateway.js'

describe('gateway Stripe', () => {
  it('recusa chaves live mesmo se o env for contornado', () => {
    expect(() => createStripeGateway({ secretKey: 'sk_live_abc', publishableKey: 'pk_test_abc' })).toThrow(/TESTE/)
    expect(() => createStripeGateway({ secretKey: 'sk_test_abc', publishableKey: 'pk_live_abc' })).toThrow(/TESTE/)
  })

  it('webhook sem segredo configurado → WebhookNotConfigured', () => {
    const gateway = createStripeGateway({ secretKey: 'sk_test_abc', publishableKey: 'pk_test_abc' })
    expect(() => gateway.verifyWebhook(Buffer.from('{}'), 't=1,v1=x')).toThrow(WebhookNotConfigured)
  })

  it('remove CPF/CNPJ e e-mail das mensagens do provedor antes do log', () => {
    const message = scrubProviderMessage('Invalid tax_id 529.982.247-25 for x_succeed@example.com (11222333000181) pi_123')
    expect(message).not.toMatch(/529|11222333|example\.com/)
    expect(message).toContain('pi_123')
  })
})
