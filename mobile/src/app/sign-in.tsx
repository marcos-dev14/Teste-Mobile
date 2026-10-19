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

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email({ message: 'E-mail inválido.' })),
  password: z.string().min(1, 'Informe sua senha.'),
})
type FormValues = z.infer<typeof schema>

export default function SignInScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const passwordRef = useRef<TextInput>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await session.signIn({ email: values.email.toLowerCase(), password: values.password })
      toast.show({ tone: 'success', message: `Bem-vindo de volta, ${user.name.split(' ')[0]}!` })
      finishAuth(redirect)
    } catch (error) {
      setFormError(isApiError(error) && error.status === 401 ? 'E-mail ou senha incorretos.' : describeError(error).message)
    }
  })

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta para finalizar compras e acompanhar pedidos."
      footer={
        <>
          <Text variant="body" color="textMuted">
            Ainda não tem conta?
          </Text>
          <Button
            title="Criar conta"
            variant="ghost"
            size="md"
            onPress={() => router.replace({ pathname: '/sign-up', params: redirect ? { redirect } : {} })}
          />
        </>
      }
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
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
              secureToggle
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
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
        <Button title="Entrar" onPress={submit} loading={formState.isSubmitting} fullWidth testID="sign-in-submit" />
      </View>
    </AuthLayout>
  )
}

const styleFactory = makeStyles((t) => ({
  form: { gap: t.space.md },
  errorBox: { padding: t.space.sm, borderRadius: t.radius.md, backgroundColor: t.colors.dangerSoft },
}))
