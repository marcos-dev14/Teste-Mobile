import type { Queryable } from '../../db/pool.js'

export interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: Date
}

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  created_at: Date
}

const toUser = (row: UserRow): UserRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
})

const USER_COLUMNS = 'id, name, email, password_hash, created_at'

export async function findUserByEmail(db: Queryable, email: string): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email])
  return rows[0] ? toUser(rows[0]) : null
}

export async function findUserById(db: Queryable, id: string): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])
  return rows[0] ? toUser(rows[0]) : null
}

/** Lança erro 23505 (unique_violation) se o e-mail já existir. */
export async function insertUser(
  db: Queryable,
  input: { name: string; email: string; passwordHash: string },
): Promise<UserRecord> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
    [input.name, input.email, input.passwordHash],
  )
  return toUser(rows[0]!)
}

// Refresh tokens ------------------------------------------------------------

export interface RefreshTokenRecord {
  id: string
  userId: string
  familyId: string
  expired: boolean
  revoked: boolean
  /** Rotacionado há menos que a janela de tolerância e com sucessor ainda ativo. */
  rotatedWithinGrace: boolean
  replacedBy: string | null
}

interface RefreshTokenRow {
  id: string
  user_id: string
  family_id: string
  expired: boolean
  revoked: boolean
  rotated_within_grace: boolean
  replaced_by: string | null
}

// Emissão e verificação de expiração usam o relógio do banco (fonte única de tempo):
// o relógio do processo Node pode divergir do servidor de banco.
export async function insertRefreshToken(
  db: Queryable,
  input: { userId: string; familyId: string; tokenHash: Buffer; ttlDays: number },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4)) RETURNING id`,
    [input.userId, input.familyId, input.tokenHash, input.ttlDays],
  )
  return rows[0]!.id
}

/** Busca e trava o token (uso dentro de transação) para serializar rotações concorrentes. */
export async function findRefreshTokenForUpdate(
  db: Queryable,
  tokenHash: Buffer,
  graceSeconds = 0,
): Promise<RefreshTokenRecord | null> {
  const { rows } = await db.query<RefreshTokenRow>(
    `SELECT t.id, t.user_id, t.family_id, t.expires_at <= now() AS expired, t.revoked_at IS NOT NULL AS revoked,
            t.replaced_by,
            (t.revoked_at > now() - make_interval(secs => $2)
             AND EXISTS (SELECT 1 FROM refresh_tokens s WHERE s.id = t.replaced_by AND s.revoked_at IS NULL))
              AS rotated_within_grace
       FROM refresh_tokens t WHERE t.token_hash = $1 FOR UPDATE OF t`,
    [tokenHash, graceSeconds],
  )
  const row = rows[0]
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        familyId: row.family_id,
        expired: row.expired,
        revoked: row.revoked,
        rotatedWithinGrace: row.rotated_within_grace === true,
        replacedBy: row.replaced_by,
      }
    : null
}

/** Trava o token e informa se ainda está ativo (não revogado e não expirado). */
export async function lockActiveRefreshToken(db: Queryable, id: string): Promise<boolean> {
  const { rows } = await db.query<{ active: boolean }>(
    'SELECT revoked_at IS NULL AND expires_at > now() AS active FROM refresh_tokens WHERE id = $1 FOR UPDATE',
    [id],
  )
  return rows[0]?.active === true
}

export async function markRefreshTokenRotated(db: Queryable, id: string, replacedBy: string): Promise<void> {
  await db.query('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1', [id, replacedBy])
}

export async function revokeRefreshTokenFamily(db: Queryable, familyId: string): Promise<number> {
  const { rowCount } = await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
    [familyId],
  )
  return rowCount ?? 0
}

/**
 * Descarte (retenção): remove tokens expirados há mais de `graceDays`. Enquanto o token é válido
 * ele é mantido, mesmo revogado, para que a reapresentação ainda seja detectada como reuso.
 */
export async function deleteExpiredRefreshTokens(db: Queryable, graceDays: number): Promise<number> {
  const { rowCount } = await db.query(
    'DELETE FROM refresh_tokens WHERE expires_at < now() - make_interval(days => $1)',
    [graceDays],
  )
  return rowCount ?? 0
}

// Exclusão de conta ------------------------------------------------------------

/** Conta existente e não excluída (consultado a cada requisição autenticada). */
export async function isActiveUser(db: Queryable, id: string): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL', [id])
  return (rowCount ?? 0) > 0
}

/** Trava a conta ativa para a exclusão (serializa com pedidos e sessões criados em paralelo). */
export async function lockActiveUser(db: Queryable, id: string): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [id])
  return rows[0] ? toUser(rows[0]) : null
}

/** Pedidos que ainda dependem do contato do cliente: aguardando pagamento, pagos ou enviados. */
export async function countOrdersInProgress(db: Queryable, userId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM orders
      WHERE user_id = $1 AND status IN ('pending_payment', 'paid', 'shipped')`,
    [userId],
  )
  return rows[0]?.total ?? 0
}

/**
 * Remove dados pessoais da conta: apaga endereços e sessões e anonimiza o usuário (nome, e-mail
 * único inválido e hash de senha inutilizável). Pedidos ficam, com o snapshot de entrega, pelo
 * prazo legal de guarda.
 */
export async function anonymizeUser(db: Queryable, id: string): Promise<void> {
  await db.query('DELETE FROM addresses WHERE user_id = $1', [id])
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id])
  await db.query(
    `UPDATE users
        SET name = 'Conta excluída', email = 'excluida+' || id || '@invalid', password_hash = '!', deleted_at = now()
      WHERE id = $1`,
    [id],
  )
}
