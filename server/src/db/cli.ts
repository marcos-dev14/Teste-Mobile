import { loadDotEnv, parseEnv } from '../config/env.js'
import { EXPIRED_TOKEN_GRACE_DAYS, runMaintenance } from '../jobs/maintenance.js'
import { deleteExpiredRefreshTokens } from '../modules/auth/repository.js'
import { createStripeGateway } from '../modules/payments/gateway.js'
import { createPaymentsService } from '../modules/payments/service.js'
import { runIntegrityChecks } from './integrity.js'
import { migrate, migrationStatus } from './migrate.js'
import { createPool } from './pool.js'
import { seed } from './seed.js'

const COMMANDS = ['migrate', 'status', 'seed', 'cleanup', 'maintenance', 'integrity'] as const

type Command = (typeof COMMANDS)[number]

function isCommand(value: string | undefined): value is Command {
  return COMMANDS.includes(value as Command)
}

async function main(): Promise<void> {
  const command = process.argv[2]
  if (!isCommand(command)) {
    console.error(`Uso: tsx src/db/cli.ts <${COMMANDS.join('|')}>`)
    process.exitCode = 1
    return
  }

  loadDotEnv()
  const env = parseEnv()
  const pool = createPool(env.DATABASE_URL, 2)
  try {
    if (command === 'migrate') {
      const applied = await migrate(pool)
      console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'Nenhuma migration pendente.')
    } else if (command === 'status') {
      for (const item of await migrationStatus(pool)) {
        const when = item.appliedAt ? ` (${item.appliedAt.toISOString()})` : ''
        console.log(`${item.state === 'applied' ? '✔' : '…'} ${item.version}_${item.name}${when}`)
      }
    } else if (command === 'integrity') {
      // Somente leitura: nada é corrigido automaticamente.
      const results = await runIntegrityChecks(pool)
      for (const result of results) console.log(`${result.count === 0 ? 'ok ' : 'ALERTA'} ${result.id}: ${result.count} — ${result.description}`)
      if (results.some((result) => result.count > 0)) process.exitCode = 1
    } else if (command === 'maintenance') {
      // Para agendador externo (cron do provedor): não depende de a API estar no ar.
      const log = { info: (obj: unknown, msg: string) => console.log(msg, JSON.stringify(obj)), error: console.error, warn: console.warn } as never
      const payments = createPaymentsService({
        pool,
        gateway: createStripeGateway({
          secretKey: env.STRIPE_SECRET_KEY!,
          publishableKey: env.STRIPE_PUBLISHABLE_KEY!,
          webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        }),
        log,
        boletoExpiresAfterDays: env.BOLETO_EXPIRES_AFTER_DAYS,
        allowTestTaxIds: env.NODE_ENV !== 'production',
      })
      const result = await runMaintenance({ pool, payments, log }, { cleanupTokens: true })
      console.log(`Manutenção: ${result.expiredOrders} pedidos expirados, ${result.refunds} reembolsos, ${result.removedTokens} sessões descartadas.`)
    } else if (command === 'cleanup') {
      const removed = await deleteExpiredRefreshTokens(pool, EXPIRED_TOKEN_GRACE_DAYS)
      console.log(`Refresh tokens expirados removidos: ${removed}.`)
    } else {
      if (env.NODE_ENV === 'production') {
        throw new Error('O seed de desenvolvimento não pode ser executado com NODE_ENV=production.')
      }
      const result = await seed(pool)
      console.log(
        `Seed concluído: ${result.products} produtos, ${result.colors} cores. ` +
          (result.demoUserCreated ? 'Usuário demo criado.' : 'Usuário demo já existia.'),
      )
    }
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
