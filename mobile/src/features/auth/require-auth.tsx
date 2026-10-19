import { Redirect, usePathname } from 'expo-router'
import type { ReactNode } from 'react'

import { useSession } from './session-store'

/** Aceita apenas caminhos internos ("/x"), evitando redirecionamento aberto via parâmetro. */
export function safeRedirect(value: unknown, fallback = '/'): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

/** Protege telas que exigem conta. A autorização real acontece no servidor; isto é só UX. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSession((state) => state.status)
  const pathname = usePathname()
  if (status === 'anonymous') {
    return <Redirect href={{ pathname: '/sign-in', params: { redirect: pathname } }} />
  }
  return <>{children}</>
}

export function useCurrentUser() {
  return useSession((state) => state.user)
}
