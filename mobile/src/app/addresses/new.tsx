import { router } from 'expo-router'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

import { AddressForm } from '@/features/addresses/address-form'
import { RequireAuth } from '@/features/auth/require-auth'
import { AppHeader, makeStyles, Screen, useStyles, useToast } from '@/ui'

export default function NewAddressScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  return (
    <RequireAuth>
      <Screen>
        <AppHeader back title="Novo endereço" fallbackHref="/addresses" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AddressForm
              onCreated={() => {
                toast.show({ tone: 'success', message: 'Endereço salvo.' })
                router.back()
              }}
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
    paddingVertical: t.space.md,
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
  },
}))
