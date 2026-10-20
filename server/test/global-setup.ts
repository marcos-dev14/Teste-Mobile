import { loadDotEnv } from '../src/config/env.js'
import { migrate } from '../src/db/migrate.js'
import { createPool } from '../src/db/pool.js'
import { assertTestDatabase } from './test-database.js'

/** Recria o schema do banco de TESTE e aplica as migrations uma vez por execução. */
export default async function setup(): Promise<void> {
  loadDotEnv()
  const url = assertTestDatabase(process.env.DATABASE_URL_TEST)
  const pool = createPool(url, 2)
  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE')
    await pool.query('CREATE SCHEMA public')
    await migrate(pool)
  } finally {
    await pool.end()
  }
}
