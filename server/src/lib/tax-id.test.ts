import { describe, expect, it } from 'vitest'

import { normalizeTaxId } from './tax-id.js'

// CPF e CNPJ sintéticos com dígitos verificadores válidos (gerados para teste, não pertencem a ninguém).
const VALID_CPF = '52998224725'
const VALID_CNPJ = '11222333000181'

describe('normalizeTaxId', () => {
  it('aceita CPF e CNPJ válidos com ou sem máscara', () => {
    expect(normalizeTaxId('529.982.247-25', { allowTestIds: false })).toBe(VALID_CPF)
    expect(normalizeTaxId('11.222.333/0001-81', { allowTestIds: false })).toBe(VALID_CNPJ)
  })

  it.each(['529.982.247-24', '111.111.111-11', '11222333000182', '123', 'abc.def.ghi-jk', ''])('recusa %p', (value) => {
    expect(normalizeTaxId(value, { allowTestIds: true })).toBeNull()
  })

  it('identificadores de teste do Stripe só fora de produção', () => {
    expect(normalizeTaxId('000.000.000-00', { allowTestIds: true })).toBe('00000000000')
    expect(normalizeTaxId('00.000.000/0000-00', { allowTestIds: true })).toBe('00000000000000')
    expect(normalizeTaxId('000.000.000-00', { allowTestIds: false })).toBeNull()
  })
})
