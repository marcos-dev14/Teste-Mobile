import pg from 'pg'

/** Pool ou client de transação: repositórios aceitam ambos. */
export interface Queryable {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<pg.QueryResult<R>>
}

export type Pool = pg.Pool
export type PoolClient = pg.PoolClient

export function createPool(connectionString: string, max = 10): pg.Pool {
  return new pg.Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'mp-ecommerce-api',
  })
}

/** Código SQLSTATE de violação de unicidade. */
export const UNIQUE_VIOLATION = '23505'

export function isPgError(error: unknown, code: string): error is pg.DatabaseError {
  return error instanceof pg.DatabaseError && error.code === code
}
