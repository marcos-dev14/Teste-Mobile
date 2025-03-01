import { z } from 'zod'

export const registerFormSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .nonempty('O nome é obrigatório.'),

  email: z
    .string()
    .email('Digite um e-mail válido.')
    .nonempty('O e-mail é obrigatório.'),

  password: 
    z.string()
    .min(6, 'A senha deve ter pelo menos 8 caracteres.')
    .nonempty('A senha é obrigatória.'),
})

export type RegisterFormSchema = z.infer<typeof registerFormSchema>;