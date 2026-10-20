import { z } from 'zod'

import { isoDateSchema, uuidSchema } from '../../lib/schemas.js'

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)

/** Unidades federativas aceitas (dado de terceiros também é conferido contra esta lista). */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const zipCodeSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(z.string().length(8, 'O CEP deve ter 8 dígitos.'))

const formatZipCode = (digits: string) => `${digits.slice(0, 5)}-${digits.slice(5)}`

export const createAddressBodySchema = z
  .object({
    fullName: text(3, 100, 'O nome completo'),
    addressLine1: text(3, 120, 'O logradouro'),
    number: z.string().trim().min(1, 'Informe o número (ou S/N).').max(10, 'O número deve ter no máximo 10 caracteres.'),
    addressLine2: z
      .string()
      .trim()
      .max(120)
      .nullish()
      .transform((value) => (value ? value : null)),
    neighborhood: text(2, 80, 'O bairro'),
    city: text(2, 80, 'A cidade'),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .pipe(z.enum(BRAZILIAN_STATES, { message: 'Informe a UF com 2 letras (ex.: SP).' })),
    zipCode: zipCodeSchema.transform(formatZipCode),
    country: text(2, 60, 'O país').default('Brasil'),
  })
  .strict()

export const addressSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  addressLine1: z.string(),
  // Nulos apenas em endereços cadastrados antes da migration 0002.
  number: z.string().nullable(),
  addressLine2: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  createdAt: isoDateSchema,
})

export const zipCodeParamsSchema = z.object({ zipCode: zipCodeSchema })

export const zipCodeLookupResponseSchema = z.object({
  zipCode: z.string(),
  street: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string(),
  state: z.enum(BRAZILIAN_STATES),
})

export type CreateAddressBody = z.infer<typeof createAddressBodySchema>
export type AddressDto = z.infer<typeof addressSchema>
export type ZipCodeLookupDto = z.infer<typeof zipCodeLookupResponseSchema>

/** Limite por usuário: evita crescimento ilimitado de dados por conta. */
export const MAX_ADDRESSES_PER_USER = 10
