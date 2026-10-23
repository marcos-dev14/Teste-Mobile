import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'

import { authApi } from '@/features/auth/api'
import { RequireAuth } from '@/features/auth/require-auth'
import { session } from '@/features/auth/session-store'
import { describeError, isApiError } from '@/lib/api/errors'
import { haptics } from '@/lib/haptics'
import { AppHeader, Button, Card, Icon, makeStyles, Screen, ScreenTitle, Text, TextField, useConfirm, useStyles, useToast, type IconName } from '@/ui'

/** O que a exclusão faz, sem prometer mais do que o servidor executa. */
const EFFECTS: { icon: IconName; text: string }[] = [
  { icon: 'person-remove-outline', text: 'Seu nome, e-mail, senha e endereços salvos são apagados.' },
  { icon: 'phone-portrait-outline', text: 'Você sai da conta em todos os aparelhos.' },
  {
    icon: 'receipt-outline',
    text: 'Pedidos já feitos (itens, valores e endereço de entrega) são guardados pelo prazo exigido pela legislação, sem acesso pelo app.',
  },
  { icon: 'time-outline', text: 'Pedidos aguardando pagamento, pagos ou em entrega precisam ser cancelados ou concluídos antes.' },
]

export default function DeleteAccountScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const confirm = useConfirm()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string>()
  const [blocked, setBlocked] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: async () => {
      void haptics.success()
      // As sessões já foram apagadas no servidor; aqui só limpa o aparelho.
      await session.signOut()
      if (router.canDismiss()) router.dismissAll()
      router.replace('/profile')
      toast.show({ tone: 'success', message: 'Sua conta foi excluída.' })
    },
    onError: (error) => {
      void haptics.error()
      if (isApiError(error) && error.code === 'INVALID_PASSWORD') setPasswordError('Senha incorreta.')
      else if (isApiError(error) && error.code === 'ACCOUNT_HAS_ORDERS_IN_PROGRESS') setBlocked(error.message)
      else toast.show({ tone: 'error', message: describeError(error).message })
    },
  })

  const submit = async () => {
    if (!password) {
      setPasswordError('Informe sua senha para confirmar.')
      return
    }
    const confirmed = await confirm({
      title: 'Excluir sua conta?',
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir conta',
      cancelLabel: 'Manter conta',
      tone: 'danger',
      icon: 'trash-outline',
    })
    if (confirmed) remove.mutate(password)
  }

  return (
    <RequireAuth>
      <Screen>
        <AppHeader back fallbackHref="/profile" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenTitle title="Excluir conta" subtitle="Confira o que acontece antes de continuar." />

            <Card style={styles.card}>
              {EFFECTS.map((effect) => (
                <View key={effect.icon} style={styles.effect}>
                  <Icon name={effect.icon} size={20} color="textMuted" />
                  <Text variant="body" style={styles.flex}>
                    {effect.text}
                  </Text>
                </View>
              ))}
            </Card>

            {blocked ? (
              <Card style={[styles.card, styles.blocked]}>
                <Text variant="bodyStrong" color="danger" testID="delete-blocked">
                  {blocked}
                </Text>
                <Button title="Ver meus pedidos" variant="secondary" size="md" onPress={() => router.push('/orders')} fullWidth />
              </Card>
            ) : null}

            <TextField
              label="Senha"
              value={password}
              onChangeText={(value) => {
                setPassword(value)
                setPasswordError(undefined)
              }}
              secureToggle
              autoComplete="current-password"
              textContentType="password"
              error={passwordError}
              hint="Por segurança, confirme com a senha da conta."
              onSubmitEditing={() => void submit()}
              returnKeyType="done"
              testID="delete-password"
            />

            <Button
              title="Excluir minha conta"
              variant="danger"
              icon="trash-outline"
              loading={remove.isPending}
              onPress={() => void submit()}
              fullWidth
              testID="delete-account"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </RequireAuth>
  )
}

const styleFactory = makeStyles((t) => ({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: t.layout.gutter,
    paddingBottom: t.space.xxl,
    gap: t.space.lg,
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: { gap: t.space.md },
  effect: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm },
  blocked: { backgroundColor: t.colors.dangerSoft, gap: t.space.sm },
}))
