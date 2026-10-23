import { randomUUID } from 'node:crypto'

import { afterAll, beforeEach } from 'vitest'

import { buildApp, type App, type BuildAppOptions } from '../src/app.js'
import { loadDotEnv, parseEnv, type Env } from '../src/config/env.js'
import { createPool, type Pool } from '../src/db/pool.js'
import { seed } from '../src/db/seed.js'
import { createFakePaymentGateway } from './fake-payment-gateway.js'
import { assertTestDatabase } from './test-database.js'

export interface TestContext {
  app: App
  pool: Pool
  env: Env
}

/**
 * Cria app + pool contra o banco de teste. Antes de cada teste limpa todas as tabelas
 * e recarrega o catálogo de seed, garantindo independência entre testes.
 */
export function setupTestApp(
  overrides: Partial<Record<keyof Env, string>> = {},
  options: Pick<BuildAppOptions, 'zipCodeLookup' | 'paymentGateway'> = {},
): TestContext {
  loadDotEnv()
  const url = assertTestDatabase(process.env.DATABASE_URL_TEST)
  const env = parseEnv({
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: url,
    JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters!!',
    RATE_LIMIT_ENABLED: 'false',
    CORS_ORIGINS: 'http://localhost:8081',
    ...overrides,
  })
  const pool = createPool(url, 5)
  const ctx = { pool, env } as TestContext

  beforeEach(async () => {
    if (!ctx.app) {
      // Nenhum teste acessa os provedores de CEP reais: sem stub, a consulta falha como indisponível.
      ctx.app = await buildApp({
        env,
        pool,
        logger: false,
        zipCodeLookup: options.zipCodeLookup ?? (async () => Promise.reject(new Error('rede desabilitada nos testes'))),
        // Nenhum teste acessa o Stripe: gateway em memória.
        paymentGateway: options.paymentGateway ?? createFakePaymentGateway().gateway,
      })
      await ctx.app.ready()
    }
    await pool.query(
      `TRUNCATE payment_events, payments, order_items, orders, addresses, refresh_tokens, users, product_colors, products
       RESTART IDENTITY CASCADE`,
    )
    await seed(pool)
  })

  afterAll(async () => {
    await ctx.app?.close()
    await pool.end()
  })

  return ctx
}

let sequence = 0

export async function registerUser(app: App, overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  sequence += 1
  const body = {
    name: 'Pessoa Teste',
    email: `pessoa${sequence}-${randomUUID().slice(0, 8)}@example.com`,
    password: 'senhaSegura1',
    ...overrides,
  }
  const response = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: body })
  if (response.statusCode !== 201) throw new Error(`register falhou: ${response.body}`)
  const json = response.json<{
    user: { id: string; email: string }
    tokens: { accessToken: string; refreshToken: string }
  }>()
  return { ...json, password: body.password, auth: { authorization: `Bearer ${json.tokens.accessToken}` } }
}

export const validAddress = {
  fullName: 'Pessoa Teste',
  addressLine1: 'Rua das Flores',
  number: '123',
  addressLine2: 'Apto 4',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310100',
  country: 'Brasil',
}

export async function createAddress(app: App, auth: Record<string, string>) {
  const response = await app.inject({ method: 'POST', url: '/v1/addresses', headers: auth, payload: validAddress })
  if (response.statusCode !== 201) throw new Error(`address falhou: ${response.body}`)
  return response.json<{ id: string }>()
}

export interface CatalogColor {
  productId: string
  colorId: string
  priceCents: number
  stock: number
  slug: string
  colorName: string
}

export async function getColor(pool: Pool, slug: string, colorName?: string): Promise<CatalogColor> {
  const { rows } = await pool.query<{
    product_id: string
    color_id: string
    price_cents: number
    stock: number
    color_name: string
  }>(
    `SELECT p.id AS product_id, pc.id AS color_id, p.price_cents, pc.stock, pc.name AS color_name
       FROM products p JOIN product_colors pc ON pc.product_id = p.id
      WHERE p.slug = $1 AND ($2::text IS NULL OR pc.name = $2)
      ORDER BY pc.position LIMIT 1`,
    [slug, colorName ?? null],
  )
  const row = rows[0]
  if (!row) throw new Error(`cor não encontrada: ${slug}/${colorName}`)
  return {
    productId: row.product_id,
    colorId: row.color_id,
    priceCents: row.price_cents,
    stock: row.stock,
    slug,
    colorName: row.color_name,
  }
}

export async function setStock(pool: Pool, colorId: string, stock: number) {
  await pool.query('UPDATE product_colors SET stock = $2 WHERE id = $1', [colorId, stock])
}

export async function getStock(pool: Pool, colorId: string): Promise<number> {
  const { rows } = await pool.query<{ stock: number }>('SELECT stock FROM product_colors WHERE id = $1', [colorId])
  return rows[0]!.stock
}
