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

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Hora local (ex.: "14:35"). */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** Tempo restante em contagem regressiva (ex.: 1799000 → "29:59"; acima de 1 h, "1:02:03"). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${String(minutes).padStart(2, '0')}:${seconds}`
}
