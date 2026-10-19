import { z } from 'zod'

import { isoDateSchema, uuidSchema } from '../../lib/schemas.js'

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)

export const createAddressBodySchema = z
  .object({
    fullName: text(3, 100, 'O nome completo'),
    addressLine1: text(3, 120, 'O endereço'),
    addressLine2: z
      .string()
      .trim()
      .max(120)
      .nullish()
      .transform((value) => (value ? value : null)),
    city: text(2, 80, 'A cidade'),
    state: text(2, 40, 'O estado'),
    zipCode: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .pipe(z.string().length(8, 'O CEP deve ter 8 dígitos.'))
      .transform((digits) => `${digits.slice(0, 5)}-${digits.slice(5)}`),
    country: text(2, 60, 'O país').default('Brasil'),
  })
  .strict()

export const addressSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  createdAt: isoDateSchema,
})

export type CreateAddressBody = z.infer<typeof createAddressBodySchema>
export type AddressDto = z.infer<typeof addressSchema>

/** Limite por usuário: evita crescimento ilimitado de dados por conta. */
export const MAX_ADDRESSES_PER_USER = 10
