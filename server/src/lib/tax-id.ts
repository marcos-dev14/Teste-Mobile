/**
 * CPF/CNPJ do pagador, exigido pelo Stripe para Pix e boleto. Validamos o formato e os dígitos
 * verificadores antes de enviar; o valor não é gravado no banco nem aparece em logs.
 */

/** Identificadores aceitos pelo Stripe em modo de teste (ignoram a validação fiscal). */
const STRIPE_TEST_TAX_IDS = new Set(['00000000000', '00000000000000'])

function checkDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index]!, 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digits = [...cpf].map(Number)
  const first = checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return digits[9] === first && digits[10] === second
}

function isValidCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  const digits = [...cnpj].map(Number)
  const first = checkDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digits[12] === first && digits[13] === second
}

/**
 * Normaliza para dígitos e valida. Retorna null se inválido.
 * `allowTestIds` aceita os identificadores de teste do Stripe — nunca em produção.
 */
export function normalizeTaxId(value: string, { allowTestIds }: { allowTestIds: boolean }): string | null {
  const digits = value.replace(/[.\-/\s]/g, '')
  if (!/^\d+$/.test(digits)) return null
  if (allowTestIds && STRIPE_TEST_TAX_IDS.has(digits)) return digits
  if (digits.length === 11) return isValidCpf(digits) ? digits : null
  if (digits.length === 14) return isValidCnpj(digits) ? digits : null
  return null
}
