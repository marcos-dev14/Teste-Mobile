import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// scrypt nativo do Node (sem dependência nativa externa). Parâmetros: N=2^15, r=8, p=1 (~32 MiB).
const COST_LOG2 = 15
const BLOCK_SIZE = 8
const PARALLELISM = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16
const PREFIX = 'scrypt'

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

function optionsFor(costLog2: number, blockSize: number, parallelism: number): ScryptOptions {
  const N = 2 ** costLog2
  return { N, r: blockSize, p: parallelism, maxmem: 256 * N * blockSize }
}

/** Formato: `scrypt$<log2N>$<r>$<p>$<salt base64url>$<hash base64url>` (parâmetros versionados no próprio hash). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await derive(password, salt, optionsFor(COST_LOG2, BLOCK_SIZE, PARALLELISM))
  return [
    PREFIX,
    COST_LOG2,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== PREFIX) return false
  const [, costLog2, blockSize, parallelism, saltB64, keyB64] = parts
  const expected = Buffer.from(keyB64!, 'base64url')
  const actual = await derive(
    password,
    Buffer.from(saltB64!, 'base64url'),
    optionsFor(Number(costLog2), Number(blockSize), Number(parallelism)),
  )
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

let dummyHash: Promise<string> | undefined

/**
 * Hash fictício usado quando o e-mail não existe, para que o tempo de resposta do login
 * não revele se a conta está cadastrada.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}
