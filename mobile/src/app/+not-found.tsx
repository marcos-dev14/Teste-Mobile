import { router } from 'expo-router'

import { AppHeader, EmptyState, Screen } from '@/ui'

export default function NotFoundScreen() {
  return (
    <Screen>
      <AppHeader back />
      <EmptyState
        icon="compass-outline"
        title="Página não encontrada"
        message="O link que você abriu não existe mais."
        actionLabel="Ir para o início"
        onAction={() => router.replace('/')}
      />
    </Screen>
  )
}
