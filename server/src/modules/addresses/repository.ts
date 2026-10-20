import type { Queryable } from '../../db/pool.js'
import type { AddressDto, CreateAddressBody } from './schemas.js'

interface AddressRow {
  id: string
  full_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip_code: string
  country: string
  created_at: Date
}

const COLUMNS =
  'id, full_name, address_line1, address_line2, city, state, zip_code, country, created_at'

const toAddress = (row: AddressRow): AddressDto => ({
  id: row.id,
  fullName: row.full_name,
  addressLine1: row.address_line1,
  addressLine2: row.address_line2,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  country: row.country,
  createdAt: row.created_at.toISOString(),
})

export async function listAddresses(db: Queryable, userId: string): Promise<AddressDto[]> {
  const { rows } = await db.query<AddressRow>(
    `SELECT ${COLUMNS} FROM addresses WHERE user_id = $1 ORDER BY created_at DESC, id`,
    [userId],
  )
  return rows.map(toAddress)
}

/** Sempre filtra pelo dono: endereço de outro usuário é indistinguível de inexistente. */
export async function findAddressForUser(
  db: Queryable,
  userId: string,
  addressId: string,
): Promise<AddressDto | null> {
  const { rows } = await db.query<AddressRow>(
    `SELECT ${COLUMNS} FROM addresses WHERE id = $1 AND user_id = $2`,
    [addressId, userId],
  )
  return rows[0] ? toAddress(rows[0]) : null
}

/**
 * Insere somente se o usuário estiver abaixo do limite (retorna null caso contrário).
 * Chame após `lockUser` na mesma transação: sem a trava, requisições simultâneas poderiam
 * ler a mesma contagem e furar o limite.
 */
export async function insertAddress(
  db: Queryable,
  userId: string,
  input: CreateAddressBody,
  maxPerUser: number,
): Promise<AddressDto | null> {
  const { rows } = await db.query<AddressRow>(
    `INSERT INTO addresses (user_id, full_name, address_line1, address_line2, city, state, zip_code, country)
     SELECT $1, $2, $3, $4, $5, $6, $7, $8
      WHERE (SELECT count(*) FROM addresses WHERE user_id = $1) < $9
     RETURNING ${COLUMNS}`,
    [
      userId,
      input.fullName,
      input.addressLine1,
      input.addressLine2,
      input.city,
      input.state,
      input.zipCode,
      input.country,
      maxPerUser,
    ],
  )
  return rows[0] ? toAddress(rows[0]) : null
}

export async function lockUser(db: Queryable, userId: string): Promise<void> {
  await db.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId])
}

export async function deleteAddressForUser(db: Queryable, userId: string, addressId: string): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [
    addressId,
    userId,
  ])
  return (rowCount ?? 0) > 0
}
