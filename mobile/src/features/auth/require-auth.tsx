import { Redirect, usePathname } from 'expo-router'
import type { ReactNode } from 'react'

import { useSession } from './session-store'

const INTERNAL_PATH = /^\/[A-Za-z0-9\-_/]*$/

/** Aceita apenas caminhos internos simples ("/checkout/address"), evitando redirecionamento aberto. */
export function safeRedirect(value: unknown, fallback = '/'): string {
  return typeof value === 'string' && INTERNAL_PATH.test(value) && !value.startsWith('//') ? value : fallback
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
