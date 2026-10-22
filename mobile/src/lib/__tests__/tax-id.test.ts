import { isValidTaxId, maskTaxId } from '../tax-id'

describe('CPF/CNPJ', () => {
  it('valida dígitos verificadores', () => {
    expect(isValidTaxId('529.982.247-25', { allowTestIds: false })).toBe(true)
    expect(isValidTaxId('529.982.247-24', { allowTestIds: false })).toBe(false)
    expect(isValidTaxId('11.222.333/0001-81', { allowTestIds: false })).toBe(true)
    expect(isValidTaxId('111.111.111-11', { allowTestIds: false })).toBe(false)
  })

  it('CPF de teste do Stripe só quando permitido', () => {
    expect(isValidTaxId('000.000.000-00', { allowTestIds: true })).toBe(true)
    expect(isValidTaxId('000.000.000-00', { allowTestIds: false })).toBe(false)
  })

  it('aplica a máscara de CPF e de CNPJ', () => {
    expect(maskTaxId('52998224725')).toBe('529.982.247-25')
    expect(maskTaxId('5299822')).toBe('529.982.2')
    expect(maskTaxId('11222333000181')).toBe('11.222.333/0001-81')
  })
})
