import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import type { Pool } from './pool.js'

export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
)

// Chave arbitrária e fixa para pg_advisory_lock: impede duas execuções simultâneas.
const MIGRATION_LOCK_KEY = 7_340_211

const FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/

interface MigrationFile {
  version: string
  name: string
  sql: string
  checksum: string
}

interface AppliedMigration {
  version: string
  name: string
  checksum: string
  applied_at: Date
}

export interface MigrationStatus {
  version: string
  name: string
  state: 'applied' | 'pending'
  appliedAt?: Date
}

async function readMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const entries = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
  const files: MigrationFile[] = []
  for (const file of entries) {
    const match = FILE_PATTERN.exec(file)
    if (!match) throw new Error(`Nome de migration inválido: ${file} (esperado NNNN_nome.sql)`)
    const sql = await readFile(path.join(dir, file), 'utf8')
    // Normaliza fim de linha para o checksum não depender do sistema operacional.
    const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
    files.push({ version: match[1]!, name: match[2]!, sql, checksum })
  }
  const versions = new Set(files.map((file) => file.version))
  if (versions.size !== files.length) throw new Error('Há migrations com número de versão repetido')
  return files
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      name       text NOT NULL,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)
}

async function loadApplied(pool: Pool): Promise<Map<string, AppliedMigration>> {
  const { rows } = await pool.query<AppliedMigration>(
    'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version',
  )
  return new Map(rows.map((row) => [row.version, row]))
}

function assertIntegrity(files: MigrationFile[], applied: Map<string, AppliedMigration>): void {
  const known = new Set(files.map((file) => file.version))
  for (const version of applied.keys()) {
    if (!known.has(version)) {
      throw new Error(`Migration ${version} foi aplicada no banco mas o arquivo não existe mais`)
    }
  }
  for (const file of files) {
    const row = applied.get(file.version)
    if (row && row.checksum !== file.checksum) {
      throw new Error(
        `Migration ${file.version}_${file.name} foi alterada após ser aplicada. ` +
          'Crie uma nova migration em vez de editar uma existente.',
      )
    }
  }
}

/** Aplica as migrations pendentes, cada uma em sua própria transação. Retorna as versões aplicadas. */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = await readMigrationFiles(dir)
  const lockClient = await pool.connect()
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])
    await ensureMigrationsTable(pool)
    const applied = await loadApplied(pool)
    assertIntegrity(files, applied)

    const appliedNow: string[] = []
    for (const file of files) {
      if (applied.has(file.version)) continue
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(file.sql)
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [file.version, file.name, file.checksum],
        )
        await client.query('COMMIT')
        appliedNow.push(`${file.version}_${file.name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Falha ao aplicar ${file.version}_${file.name}: ${(error as Error).message}`, {
          cause: error,
        })
      } finally {
        client.release()
      }
    }
    return appliedNow
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {})
    lockClient.release()
  }
}

export async function migrationStatus(pool: Pool, dir = MIGRATIONS_DIR): Promise<MigrationStatus[]> {
  const files = await readMigrationFiles(dir)
  await ensureMigrationsTable(pool)
  const applied = await loadApplied(pool)
  assertIntegrity(files, applied)
  return files.map((file) => {
    const row = applied.get(file.version)
    return row
      ? { version: file.version, name: file.name, state: 'applied', appliedAt: row.applied_at }
      : { version: file.version, name: file.name, state: 'pending' }
  })
}
