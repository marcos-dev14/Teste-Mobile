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
    .nonempty('O número do cartão é obrigatório.'),

  expirationDate: z
    .string()
    .nonempty('A data de validade é obrigatória.'),

  securityCode: z
    .string()
    .nonempty('O código de segurança é obrigatório.'),
});

export type PaymentFormSchema = z.infer<typeof paymentFormSchema>