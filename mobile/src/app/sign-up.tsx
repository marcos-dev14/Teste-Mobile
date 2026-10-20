import { zodResolver } from '@hookform/resolvers/zod'
import { router, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View, type TextInput } from 'react-native'
import { z } from 'zod'

import { AuthLayout, finishAuth } from '@/features/auth/auth-form'
import { session } from '@/features/auth/session-store'
import { describeError, isApiError } from '@/lib/api/errors'
import { Button, makeStyles, Text, TextField, useStyles, useToast } from '@/ui'

// Mesma política do servidor; o servidor continua sendo a validação definitiva.
const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(100),
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email({ message: 'E-mail inválido.' })),
  password: z
    .string()
    .min(8, 'Use pelo menos 8 caracteres.')
    .max(128)
    .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
    .regex(/\d/, 'Inclua ao menos um número.'),
})
type FormValues = z.infer<typeof schema>

export default function SignUpScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await session.signUp({ ...values, email: values.email.toLowerCase() })
      toast.show({ tone: 'success', message: `Conta criada. Boas-vindas, ${user.name.split(' ')[0]}!` })
      finishAuth(redirect)
    } catch (error) {
      if (isApiError(error) && error.code === 'EMAIL_IN_USE') {
        setError('email', { message: 'Já existe uma conta com este e-mail.' })
      } else {
        setFormError(describeError(error).message)
      }
    }
  })

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Leva menos de um minuto. Seus dados ficam protegidos."
      footer={
        <>
          <Text variant="body" color="textMuted">
            Já tem conta?
          </Text>
          <Button
            title="Entrar"
            variant="ghost"
            size="md"
            onPress={() => router.replace({ pathname: '/sign-in', params: redirect ? { redirect } : {} })}
          />
        </>
      }
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              ref={emailRef}
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              ref={passwordRef}
              label="Senha"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              hint="Mínimo de 8 caracteres, com letras e números."
              secureToggle
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
          )}
        />
        {formError ? (
          <View style={styles.errorBox} accessibilityLiveRegion="assertive">
            <Text variant="label" color="danger">
              {formError}
            </Text>
          </View>
        ) : null}
        <Button title="Criar conta" onPress={submit} loading={formState.isSubmitting} fullWidth />
      </View>
    </AuthLayout>
  )
}

const styleFactory = makeStyles((t) => ({
  form: { gap: t.space.md },
  errorBox: { padding: t.space.sm, borderRadius: t.radius.md, backgroundColor: t.colors.dangerSoft },
}))
