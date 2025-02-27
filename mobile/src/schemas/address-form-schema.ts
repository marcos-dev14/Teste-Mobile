import { z } from 'zod'

export const addressFormSchema = z.object({
  full_name: z
    .string()
    .min(4, 'O nome completo deve ter pelo menos 4 caracteres.')
    .nonempty('O nome completo é obrigatório.'),
    
  address_line_1: z
    .string()
    .min(6, 'O endereço (linha 1) deve ter pelo menos 6 caracteres.')
    .nonempty('O endereço (linha 1) é obrigatório.'),
    
  address_line_2: z
    .string()
    .min(6, 'O endereço (linha 2) deve ter pelo menos 6 caracteres.')
    .nonempty('O endereço (linha 2) é obrigatório.'),
    
  city: z
    .string()
    .min(4, 'A cidade deve ter pelo menos 4 caracteres.')
    .nonempty('A cidade é obrigatória.'),
    
  state: z
    .string()
    .min(1, 'O estado ou região deve ter pelo menos 1 caracteres.')
    .nonempty('O estado ou região é obrigatório.'),
    
  zip_code: z
    .string()
    .min(8, 'O CEP deve ter pelo menos 8 caracteres (formato: XXXXX-XXX).')
    .nonempty('O CEP é obrigatório.'),
    
  country: z
    .string()
    .min(4, 'O país deve ter pelo menos 4 caracteres.')
    .nonempty('O país é obrigatório.'),
});

export type AddressFormData = z.infer<typeof addressFormSchema>;