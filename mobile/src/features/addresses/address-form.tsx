import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AccessibilityInfo, ActivityIndicator, View, type TextInput } from 'react-native'
import { z } from 'zod'

import { isApiError } from '@/lib/api/errors'
import type { Address, CreateAddressInput } from '@/lib/api/types'
import { maskZipCode } from '@/lib/format'
import { Button, makeStyles, Text, TextField, useStyles, useTheme, useToast } from '@/ui'

import { fetchZipCode, useCreateAddress } from './api'

/** Mesma lista do servidor. */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

// Mesmas regras do servidor (o servidor continua sendo a validação definitiva).
export const addressFormSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo.').max(100),
  zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP deve ter 8 dígitos.'),
  addressLine1: z.string().trim().min(3, 'Informe a rua.').max(120),
  number: z.string().trim().min(1, 'Informe o número (ou S/N).').max(10, 'Máximo de 10 caracteres.'),
  addressLine2: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().min(2, 'Informe o bairro.').max(80),
  city: z.string().trim().min(2, 'Informe a cidade.').max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => (BRAZILIAN_STATES as readonly string[]).includes(value), 'UF inválida (ex.: SP).'),
  country: z.string().trim().min(2, 'Informe o país.').max(60),
})

type FormValues = z.infer<typeof addressFormSchema>
type FieldName = keyof FormValues

interface FieldConfig {
  name: FieldName
  label: string
  autoComplete?: 'name' | 'street-address' | 'postal-code' | 'country'
  /** Proporção da largura quando divide a linha com outro campo. */
  flex?: number
}

/** Linhas do formulário; campos lado a lado dividem a largura. CEP antes da rua: ele preenche o resto. */
const ROWS: FieldConfig[][] = [
  [{ name: 'fullName', label: 'Nome de quem recebe', autoComplete: 'name' }],
  [{ name: 'zipCode', label: 'CEP', autoComplete: 'postal-code' }],
  [{ name: 'addressLine1', label: 'Rua', autoComplete: 'street-address' }],
  [
    { name: 'number', label: 'Número' },
    { name: 'addressLine2', label: 'Complemento (opcional)', flex: 1.6 },
  ],
  [{ name: 'neighborhood', label: 'Bairro' }],
  [
    { name: 'city', label: 'Cidade', flex: 2.4 },
    { name: 'state', label: 'UF' },
  ],
  [{ name: 'country', label: 'País', autoComplete: 'country' }],
]
const ORDER = ROWS.flat().map((field) => field.name)

/** Campos que a consulta de CEP pode sugerir. */
type AutoFillField = 'addressLine1' | 'neighborhood' | 'city' | 'state'

type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'unavailable'

const LOOKUP_MESSAGES: Partial<Record<LookupStatus, string>> = {
  loading: 'Buscando endereço…',
  found: 'Endereço sugerido pelo CEP. Confira e complete.',
  not_found: 'CEP não encontrado. Confira o número ou preencha o endereço.',
  unavailable: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
}

export function AddressForm({ onCreated, submitLabel = 'Salvar endereço' }: { onCreated: (address: Address) => void; submitLabel?: string }) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const createAddress = useCreateAddress()
  const inputs = useRef<Partial<Record<FieldName, TextInput | null>>>({})
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  /** CEP da consulta mais recente: respostas de CEPs anteriores são descartadas. */
  const currentLookup = useRef<string | null>(null)
  /** Último valor preenchido automaticamente em cada campo. */
  const autoFilled = useRef<Partial<Record<AutoFillField, string>>>({})

  const { control, handleSubmit, setError, setValue, getValues, formState } = useForm<FormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      fullName: '',
      zipCode: '',
      addressLine1: '',
      number: '',
      addressLine2: '',
      neighborhood: '',
      city: '',
      state: '',
      country: 'Brasil',
    },
    mode: 'onTouched',
  })

  const lookupZipCode = async (digits: string) => {
    currentLookup.current = digits
    setLookupStatus('loading')
    try {
      const result = await fetchZipCode(queryClient, digits)
      if (currentLookup.current !== digits) return
      const suggestions: Record<AutoFillField, string | null> = {
        addressLine1: result.street,
        neighborhood: result.neighborhood,
        city: result.city,
        state: result.state,
      }
      for (const [field, value] of Object.entries(suggestions) as [AutoFillField, string | null][]) {
        if (!value) continue
        const current = getValues(field) ?? ''
        // Nunca sobrescreve o que a pessoa digitou: só campos vazios ou ainda com a sugestão anterior.
        if (current.trim() === '' || current === autoFilled.current[field]) {
          setValue(field, value, { shouldValidate: true })
          autoFilled.current[field] = value
        }
      }
      setLookupStatus('found')
      AccessibilityInfo.announceForAccessibility(LOOKUP_MESSAGES.found!)
      // O CEP não informa o número; sem rua (CEP geral da cidade), a rua vem primeiro.
      inputs.current[result.street ? 'number' : 'addressLine1']?.focus()
    } catch (error) {
      if (currentLookup.current !== digits) return
      const status: LookupStatus = isApiError(error) && error.status === 404 ? 'not_found' : 'unavailable'
      setLookupStatus(status)
      AccessibilityInfo.announceForAccessibility(LOOKUP_MESSAGES[status]!)
    }
  }

  const onZipCodeChange = (text: string, onChange: (value: string) => void) => {
    const masked = maskZipCode(text)
    onChange(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length < 8) {
      currentLookup.current = null
      setLookupStatus('idle')
    } else if (digits !== currentLookup.current) {
      void lookupZipCode(digits)
    }
  }

  const submit = handleSubmit(async (values) => {
    const input: CreateAddressInput = { ...values, addressLine2: values.addressLine2 || null }
    try {
      const address = await createAddress.mutateAsync(input)
      onCreated(address)
    } catch (error) {
      // Mapeia erros de validação do servidor ("body.zipCode") para os campos.
      const details = isApiError(error) ? (error.details ?? []) : []
      let mapped = false
      for (const detail of details) {
        const field = String(detail.path ?? '').replace(/^body\./, '') as FieldName
        if (field in addressFormSchema.shape) {
          setError(field, { message: String(detail.message) })
          mapped = true
        }
      }
      if (!mapped) toast.show({ tone: 'error', message: isApiError(error) ? error.message : 'Não foi possível salvar.' })
    }
  })

  const renderField = (field: FieldConfig) => {
    const index = ORDER.indexOf(field.name)
    const isZipCode = field.name === 'zipCode'
    return (
      <Controller
        key={field.name}
        control={control}
        name={field.name}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <View style={{ flex: field.flex ?? 1 }}>
            <TextField
              ref={(ref) => {
                inputs.current[field.name] = ref
              }}
              label={field.label}
              value={value ?? ''}
              onBlur={onBlur}
              onChangeText={(text) => {
                if (isZipCode) onZipCodeChange(text, onChange)
                else onChange(field.name === 'state' ? text.toUpperCase() : text)
              }}
              error={fieldState.error?.message}
              hint={isZipCode ? LOOKUP_MESSAGES[lookupStatus] : undefined}
              accessory={
                isZipCode && lookupStatus === 'loading' ? (
                  <ActivityIndicator size="small" color={theme.colors.textMuted} accessibilityLabel="Buscando endereço" />
                ) : undefined
              }
              autoComplete={field.autoComplete}
              keyboardType={isZipCode ? 'number-pad' : 'default'}
              autoCapitalize={field.name === 'state' ? 'characters' : 'words'}
              maxLength={field.name === 'state' ? 2 : undefined}
              returnKeyType={index === ORDER.length - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                const next = ORDER[index + 1]
                if (next) inputs.current[next]?.focus()
                else void submit()
              }}
              testID={`address-${field.name}`}
            />
          </View>
        )}
      />
    )
  }

  return (
    <View style={styles.form}>
      {ROWS.map((row) => (
        <View key={row[0]!.name} style={styles.row}>
          {row.map(renderField)}
        </View>
      ))}
      <Text variant="caption" color="textMuted">
        Usamos este endereço apenas para a entrega dos seus pedidos.
      </Text>
      <Button title={submitLabel} onPress={submit} loading={formState.isSubmitting} fullWidth testID="address-submit" />
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  form: { gap: t.space.md },
  row: { flexDirection: 'row', gap: t.space.sm },
}))
