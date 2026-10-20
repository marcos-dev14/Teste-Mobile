import type { Pool } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { AppError, conflict, notFound } from '../../lib/errors.js'
import * as repo from './repository.js'
import { MAX_ADDRESSES_PER_USER, type AddressDto, type CreateAddressBody, type ZipCodeLookupDto } from './schemas.js'
import { ZipCodeLookupUnavailable, type ZipCodeLookup } from './zip-code.js'

export function createAddressesService({ pool, zipCodeLookup }: { pool: Pool; zipCodeLookup: ZipCodeLookup }) {
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

    /** Sugestão de preenchimento: o formulário continua editável e o `create` valida tudo de novo. */
    async lookupZipCode(digits: string): Promise<ZipCodeLookupDto> {
      try {
        const result = await zipCodeLookup(digits)
        if (!result) throw notFound('CEP não encontrado.', 'ZIP_CODE_NOT_FOUND')
        return result
      } catch (error) {
        if (!(error instanceof ZipCodeLookupUnavailable)) throw error
        throw new AppError(503, 'ZIP_CODE_LOOKUP_UNAVAILABLE', 'Consulta de CEP indisponível. Preencha o endereço manualmente.')
      }
    },

    async remove(userId: string, addressId: string): Promise<void> {
      if (!(await repo.deleteAddressForUser(pool, userId, addressId))) {
        throw notFound('Endereço não encontrado.', 'ADDRESS_NOT_FOUND')
      }
    },
  }
}

export type AddressesService = ReturnType<typeof createAddressesService>
