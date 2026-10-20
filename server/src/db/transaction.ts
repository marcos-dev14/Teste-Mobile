import type { Pool, PoolClient } from './pool.js'

/**
 * Executa `fn` dentro de uma transação. Faz ROLLBACK em qualquer erro e sempre devolve o client
 * ao pool; se o próprio ROLLBACK falhar, o client é descartado em vez de reutilizado.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (tx: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  let releaseError: Error | undefined
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      releaseError = rollbackError as Error
    }
    throw error
  } finally {
    client.release(releaseError)
  }
}
