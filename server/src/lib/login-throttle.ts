/**
 * Limite de tentativas de login por e-mail (complementa o limite por IP, que um atacante contorna
 * trocando de IP). Vale para qualquer e-mail, exista a conta ou não, para não revelar cadastros.
 * Em memória: correto para uma instância; com várias, mover para um store compartilhado (Redis).
 */
export interface LoginThrottle {
  /** Segundos até liberar, ou 0 se a tentativa pode prosseguir. */
  retryAfter(email: string): number
  recordFailure(email: string): void
  reset(email: string): void
}

export function createLoginThrottle(options: {
  maxFailures?: number
  windowMs?: number
  maxEntries?: number
  now?: () => number
} = {}): LoginThrottle {
  const { maxFailures = 5, windowMs = 15 * 60_000, maxEntries = 10_000, now = Date.now } = options
  const failures = new Map<string, { count: number; resetAt: number }>()

  const current = (email: string) => {
    const entry = failures.get(email)
    if (entry && entry.resetAt <= now()) {
      failures.delete(email)
      return undefined
    }
    return entry
  }

  return {
    retryAfter(email) {
      const entry = current(email)
      return entry && entry.count >= maxFailures ? Math.ceil((entry.resetAt - now()) / 1000) : 0
    },
    recordFailure(email) {
      const entry = current(email)
      if (entry) {
        entry.count += 1
        return
      }
      // Limite de memória: descarta a entrada mais antiga.
      if (failures.size >= maxEntries) failures.delete(failures.keys().next().value!)
      failures.set(email, { count: 1, resetAt: now() + windowMs })
    },
    reset(email) {
      failures.delete(email)
    },
  }
}
