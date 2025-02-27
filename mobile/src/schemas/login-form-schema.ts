import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z
    .string()
    .email('Digite um e-mail válido.')
    .nonempty('O e-mail é obrigatório.'),

  password: 
    z.string()
    .min(6, 'A senha deve ter pelo menos 8 caracteres.')
    .nonempty('A senha é obrigatória.'),
})

export type LoginFormSchema = z.infer<typeof loginFormSchema>;