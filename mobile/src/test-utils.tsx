import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react-native'
import type { ReactElement, ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ConfirmProvider, ThemeProvider, ToastProvider } from '@/ui'

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

/** Provedores do app para testes (também usado com `renderHook`). */
export function createTestWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider scheme="light">
        <QueryClientProvider client={client}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
  return { client, Wrapper }
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const { client, Wrapper } = createTestWrapper()
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) }
}
