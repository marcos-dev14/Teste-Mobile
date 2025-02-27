import { z } from 'zod'

export const paymentFormSchema = z.object({
  fullName: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .nonempty('O nome no cartão é obrigatório.'),

  fullNameOnCard: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .nonempty('O nome no cartão é obrigatório.'),

  cardNumber: z
    .string()
    .regex(/^\d{16}$/, 'O número do cartão deve ter 16 dígitos.')
    .nonempty('O número do cartão é obrigatório.'),

  expirationDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'A data de validade deve estar no formato MM/AA.')
    .nonempty('A data de validade é obrigatória.'),

  securityCode: z
    .string()
    .regex(/^\d{3,4}$/, 'O código de segurança deve ter 3 ou 4 dígitos.')
    .nonempty('O código de segurança é obrigatório.'),
});

export type PaymentFormSchema = z.infer<typeof paymentFormSchema>