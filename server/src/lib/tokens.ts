import { createHash, randomBytes } from 'node:crypto'

/** Refresh token opaco: 256 bits aleatórios. Só o hash é persistido. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest()
}

/** SHA-256 hexadecimal de um valor serializável de forma determinística (chaves ordenadas). */
export function fingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
