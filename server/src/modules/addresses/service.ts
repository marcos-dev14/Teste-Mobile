import type { Pool } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { conflict, notFound } from '../../lib/errors.js'
import * as repo from './repository.js'
import { MAX_ADDRESSES_PER_USER, type AddressDto, type CreateAddressBody } from './schemas.js'

export function createAddressesService({ pool }: { pool: Pool }) {
  return {
    list: (userId: string): Promise<AddressDto[]> => repo.listAddresses(pool, userId),

    async create(userId: string, input: CreateAddressBody): Promise<AddressDto> {
      const address = await withTransaction(pool, async (tx) => {
        // Serializa criações do mesmo usuário para o limite não ser furado por concorrência.
        await repo.lockUser(tx, userId)
        return repo.insertAddress(tx, userId, input, MAX_ADDRESSES_PER_USER)
      })
      if (!address) {
        throw conflict('ADDRESS_LIMIT', `Você pode ter no máximo ${MAX_ADDRESSES_PER_USER} endereços.`)
      }
      return address
    },

    async remove(userId: string, addressId: string): Promise<void> {
      if (!(await repo.deleteAddressForUser(pool, userId, addressId))) {
        throw notFound('Endereço não encontrado.', 'ADDRESS_NOT_FOUND')
      }
    },
  }
}

export type AddressesService = ReturnType<typeof createAddressesService>
