import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

import { isApiError } from './api/errors'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        // Erros 4xx não melhoram com retentativa; rede/5xx tentam mais 2 vezes.
        retry: (failureCount, error) => !(isApiError(error) && error.isClientError) && failureCount < 2,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}

let wired = false

/** Integra o React Query ao ciclo de vida do app (foco) e à conectividade (pausa offline, retoma ao reconectar). */
export function wireQueryLifecycle() {
  if (wired) return
  wired = true

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  )

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'))
  }
}
