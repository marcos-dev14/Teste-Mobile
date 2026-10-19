import { z } from 'zod'

import { isoDateSchema, uuidSchema } from '../../lib/schemas.js'

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo.')
  .pipe(z.email({ message: 'Informe um e-mail válido.' }))

/** Política de senha aplicada no servidor (o app replica apenas para feedback imediato). */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(128, 'A senha deve ter no máximo 128 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/\d/, 'A senha deve conter ao menos um número.')

export const registerBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(100),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict()

export const loginBodySchema = z
  .object({
    email: emailSchema,
    // No login não se aplica a política (apenas limites), para não revelar regras a quem testa senhas.
    password: z.string().min(1, 'Informe a senha.').max(128),
  })
  .strict()

export const refreshBodySchema = z
  .object({ refreshToken: z.string().min(32).max(128) })
  .strict()

export const userSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string(),
  createdAt: isoDateSchema,
})

export const tokensSchema = z.object({
  tokenType: z.literal('Bearer'),
  accessToken: z.string(),
  expiresIn: z.number().int(),
  refreshToken: z.string(),
})

export const authResponseSchema = z.object({ user: userSchema, tokens: tokensSchema })
export const refreshResponseSchema = z.object({ tokens: tokensSchema })

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type UserDto = z.infer<typeof userSchema>
export type TokensDto = z.infer<typeof tokensSchema>
