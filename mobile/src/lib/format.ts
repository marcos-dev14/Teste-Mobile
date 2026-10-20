const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata centavos em reais (ex.: 2999 → "R$ 29,99"). */
export function formatMoney(cents: number): string {
  // Intl separa "R$" do valor com espaço não separável (U+00A0); normalizamos para espaço comum.
  return currency.format(cents / 100).replace(/[\u00a0\u202f]/g, ' ')
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso)).replace(/\./g, '')
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Máscara de CEP enquanto o usuário digita: "01310100" → "01310-100". */
export function maskZipCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export function formatRating(rating: number): string {
  return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
