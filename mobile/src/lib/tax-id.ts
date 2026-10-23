/**
 * CPF/CNPJ do pagador (Pix e boleto). Mesma regra do servidor, que continua sendo a validação
 * definitiva; aqui serve para feedback imediato. O valor não é salvo no aparelho.
 */

/** Identificadores aceitos pelo Stripe em modo de teste. */
const STRIPE_TEST_TAX_IDS = new Set(['00000000000', '00000000000000'])

function checkDigit(digits: number[], weights: number[]): number {
  const rest = digits.reduce((total, digit, index) => total + digit * weights[index]!, 0) % 11
  return rest < 2 ? 0 : 11 - rest
}

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digits = [...cpf].map(Number)
  return (
    digits[9] === checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    digits[10] === checkDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  )
}

function isValidCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  const digits = [...cnpj].map(Number)
  return (
    digits[12] === checkDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    digits[13] === checkDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  )
}

/** `allowTestIds`: aceitar os identificadores de teste do Stripe (o servidor informa o modo). */
export function isValidTaxId(value: string, { allowTestIds }: { allowTestIds: boolean }): boolean {
  const digits = value.replace(/\D/g, '')
  if (allowTestIds && STRIPE_TEST_TAX_IDS.has(digits)) return true
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}

/** Máscara enquanto digita: CPF até 11 dígitos, CNPJ a partir do 12º. */
export function maskTaxId(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
