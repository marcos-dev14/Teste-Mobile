import { existsSync } from 'node:fs'
import { z } from 'zod'

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  RATE_LIMIT_ENABLED: booleanString.default(true),
  /**
   * Proxy reverso confiável: `false` ou lista de IPs/CIDRs do proxy (ex.: `10.0.0.0/8`).
   * `true` confia em qualquer `X-Forwarded-For` — o cliente forjaria o próprio IP e escaparia do
   * limite por IP; por isso é recusado em produção. (O Fastify trata contagem de saltos como
   * "não confiar", então ela não é oferecida.)
   */
  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((value): boolean | string => {
      const trimmed = value.trim()
      if (trimmed === 'false' || trimmed === '') return false
      if (trimmed === 'true') return true
      return trimmed
    }),
  // Stripe: SOMENTE modo de teste. Chave live derruba o boot (as mensagens nunca incluem o valor).
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^(sk|rk)_test_[A-Za-z0-9]+$/, 'use apenas chave secreta de TESTE (sk_test_…); chaves live são recusadas')
    .optional(),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_test_[A-Za-z0-9]+$/, 'use apenas chave publicável de TESTE (pk_test_…); chaves live são recusadas')
    .optional(),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_[A-Za-z0-9]+$/, 'formato inválido (whsec_…)').optional(),
  /** Minutos em que o estoque fica reservado para cartão e Pix (o Pix expira junto). */
  PAYMENT_RESERVATION_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(30),
  /** Métodos oferecidos. Habilite só o que a conta Stripe tem disponível (docs/audit/checkout-stripe.md). */
  PAYMENT_METHODS: z
    .string()
    .default('credit_card,pix,boleto')
    .transform((value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))])
    .pipe(z.array(z.enum(['credit_card', 'pix', 'boleto'])).min(1, 'habilite ao menos um método')),
  /** Dias corridos até o vencimento do boleto (limite do Stripe: 0 a 60). */
  BOLETO_EXPIRES_AFTER_DAYS: z.coerce.number().int().min(0).max(60).default(3),
  /** Dias de reserva após o vencimento: o Stripe confirma o boleto pago em até 1 dia útil. */
  BOLETO_CONFIRMATION_GRACE_DAYS: z.coerce.number().int().min(1).max(10).default(4),
})

const EXAMPLE_SECRET_MARKER = 'troque-por-um-segredo'

export type Env = z.infer<typeof envSchema>

/** Carrega `.env` do diretório atual (se existir) sem sobrescrever variáveis já definidas. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path)
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Configuração inválida:\n${issues}`)
  }
  // Nos testes o gateway é substituído por um falso; fora deles, pagamento é obrigatório.
  if (result.data.NODE_ENV !== 'test' && (!result.data.STRIPE_SECRET_KEY || !result.data.STRIPE_PUBLISHABLE_KEY)) {
    throw new Error(
      'Configuração inválida:\n  - STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY: defina as chaves de TESTE do Stripe (ver .env.example)',
    )
  }
  if (result.data.NODE_ENV === 'production' && result.data.TRUST_PROXY === true) {
    throw new Error(
      'Configuração inválida:\n  - TRUST_PROXY: em produção informe os IPs/CIDRs do proxy, não true',
    )
  }
  if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET.includes(EXAMPLE_SECRET_MARKER)) {
    throw new Error(
      'Configuração inválida:\n  - JWT_SECRET: o valor de exemplo do .env.example não pode ser usado em produção',
    )
  }
  return result.data
}
