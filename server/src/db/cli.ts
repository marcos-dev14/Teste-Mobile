import { loadDotEnv, parseEnv } from '../config/env.js'
import { deleteExpiredRefreshTokens } from '../modules/auth/repository.js'
import { migrate, migrationStatus } from './migrate.js'
import { createPool } from './pool.js'
import { seed } from './seed.js'

const COMMANDS = ['migrate', 'status', 'seed', 'cleanup'] as const

/** Dias após a expiração em que o refresh token ainda é mantido antes do descarte. */
const EXPIRED_TOKEN_GRACE_DAYS = 7
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
