import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View, type TextInput } from 'react-native'
import { z } from 'zod'

import { isApiError } from '@/lib/api/errors'
import type { Address, NewAddress } from '@/lib/api/types'
import { maskZipCode } from '@/lib/format'
import { Button, makeStyles, Text, TextField, useStyles, useToast } from '@/ui'

import { useCreateAddress } from './api'

// Mesmas regras do servidor (o servidor continua sendo a validação definitiva).
export const addressFormSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo.').max(100),
  addressLine1: z.string().trim().min(3, 'Informe rua e número.').max(120),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Informe a cidade.').max(80),
  state: z.string().trim().min(2, 'Informe o estado.').max(40),
  zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP deve ter 8 dígitos.'),
  country: z.string().trim().min(2, 'Informe o país.').max(60),
})

type FormValues = z.infer<typeof addressFormSchema>

const FIELDS: {
  name: keyof FormValues
  label: string
  autoComplete?: 'name' | 'street-address' | 'postal-code' | 'country'
  half?: boolean
}[] = [
  { name: 'fullName', label: 'Nome de quem recebe', autoComplete: 'name' },
  { name: 'zipCode', label: 'CEP', autoComplete: 'postal-code' },
  { name: 'addressLine1', label: 'Rua e número', autoComplete: 'street-address' },
  { name: 'addressLine2', label: 'Complemento (opcional)' },
  { name: 'city', label: 'Cidade', half: true },
  { name: 'state', label: 'Estado', half: true },
  { name: 'country', label: 'País', autoComplete: 'country' },
]

export function AddressForm({ onCreated, submitLabel = 'Salvar endereço' }: { onCreated: (address: Address) => void; submitLabel?: string }) {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const createAddress = useCreateAddress()
  const inputs = useRef<Partial<Record<keyof FormValues, TextInput | null>>>({})

  const { control, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { fullName: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: 'Brasil' },
    mode: 'onTouched',
  })

  const submit = handleSubmit(async (values) => {
    const input: NewAddress = { ...values, addressLine2: values.addressLine2 || null }
    try {
      const address = await createAddress.mutateAsync(input)
      onCreated(address)
    } catch (error) {
      // Mapeia erros de validação do servidor ("body.zipCode") para os campos.
      const details = isApiError(error) ? (error.details ?? []) : []
      let mapped = false
      for (const detail of details) {
        const field = String(detail.path ?? '').replace(/^body\./, '') as keyof FormValues
        if (field in addressFormSchema.shape) {
          setError(field, { message: String(detail.message) })
          mapped = true
        }
      }
      if (!mapped) toast.show({ tone: 'error', message: isApiError(error) ? error.message : 'Não foi possível salvar.' })
    }
  })

  const renderField = (field: (typeof FIELDS)[number], index: number) => (
    <Controller
      key={field.name}
      control={control}
      name={field.name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <View style={field.half ? styles.half : undefined}>
          <TextField
            ref={(ref) => {
              inputs.current[field.name] = ref
            }}
            label={field.label}
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={(text) => onChange(field.name === 'zipCode' ? maskZipCode(text) : text)}
            error={fieldState.error?.message}
            autoComplete={field.autoComplete}
            keyboardType={field.name === 'zipCode' ? 'number-pad' : 'default'}
            autoCapitalize={field.name === 'state' ? 'characters' : 'words'}
            returnKeyType={index === FIELDS.length - 1 ? 'done' : 'next'}
            onSubmitEditing={() => {
              const next = FIELDS[index + 1]
              if (next) inputs.current[next.name]?.focus()
              else void submit()
            }}
          />
        </View>
      )}
    />
  )

  return (
    <View style={styles.form}>
      {FIELDS.slice(0, 4).map(renderField)}
      <View style={styles.row}>{FIELDS.slice(4, 6).map((field, offset) => renderField(field, 4 + offset))}</View>
      {renderField(FIELDS[6]!, 6)}
      <Text variant="caption" color="textMuted">
        Usamos este endereço apenas para a entrega dos seus pedidos.
      </Text>
      <Button title={submitLabel} onPress={submit} loading={formState.isSubmitting} fullWidth />
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  form: { gap: t.space.md },
  row: { flexDirection: 'row', gap: t.space.sm },
  half: { flex: 1 },
}))
