import { router } from 'expo-router'
import { Alert, ScrollView, View } from 'react-native'

import { session, useSession } from '@/features/auth/session-store'
import { env } from '@/lib/env'
import { AppHeader, Button, ScreenTitle, Card, Divider, EmptyState, ListItem, makeStyles, Screen, Text, useStyles, useToast } from '@/ui'

export default function ProfileScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const user = useSession((state) => state.user)

  if (!user) {
    return (
      <Screen>
        <AppHeader largeTitle="Perfil" />
        <EmptyState
          icon="person-circle-outline"
          title="Entre na sua conta"
          message="Acompanhe pedidos, salve endereços e finalize compras mais rápido."
          actionLabel="Entrar"
          onAction={() => router.push('/sign-in')}
        />
        <View style={styles.signUp}>
          <Button title="Criar conta" variant="ghost" size="md" onPress={() => router.push('/sign-up')} />
        </View>
        <AppInfo />
      </Screen>
    )
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const confirmSignOut = () =>
    Alert.alert('Sair da conta?', 'Sua sacola continua salva neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void session.signOut().then(() => toast.show({ message: 'Você saiu da sua conta.' }))
        },
      },
    ])

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Perfil" />
        <View style={styles.identity}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <Text variant="headline" color="onPrimary">
              {initials}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text variant="headline">{user.name}</Text>
            <Text variant="body" color="textMuted">
              {user.email}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <ListItem icon="receipt-outline" title="Meus pedidos" subtitle="Acompanhe suas compras" onPress={() => router.push('/orders')} />
          <Divider inset={48} />
          <ListItem icon="location-outline" title="Endereços" subtitle="Gerencie seus endereços de entrega" onPress={() => router.push('/addresses')} />
        </Card>

        <Card style={styles.card}>
          <ListItem icon="log-out-outline" title="Sair" destructive onPress={confirmSignOut} />
        </Card>
        <AppInfo />
      </ScrollView>
    </Screen>
  )
}

function AppInfo() {
  const styles = useStyles(styleFactory)
  return (
    <View style={styles.info}>
      <Text variant="caption" color="textMuted" align="center">
        Vesti v{env.appVersion}
      </Text>
      {__DEV__ ? (
        <Text variant="caption" color="textMuted" align="center" selectable>
          API: {env.apiUrl}
        </Text>
      ) : null}
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  content: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space.xxl, gap: t.space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  identityText: { flex: 1, gap: 2 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { paddingVertical: t.space.xxs },
  signUp: { alignItems: 'center', marginTop: -t.space.xxl },
  info: { gap: 2, paddingVertical: t.space.lg },
}))
