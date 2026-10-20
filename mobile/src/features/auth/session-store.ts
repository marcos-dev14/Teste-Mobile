import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

import { setAuthBridge } from '@/lib/api/client'
import { isApiError } from '@/lib/api/errors'
import type { AuthResponse, User } from '@/lib/api/types'

import { authApi } from './api'

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

interface SessionState {
  status: SessionStatus
  user: User | null
  /** Access token apenas em memória (vida curta). O refresh token fica no SecureStore. */
  accessToken: string | null
  /** Como a última sessão terminou: 'user' (logout explícito) ou 'expired' (servidor recusou o refresh). */
  endedBy: 'user' | 'expired' | null
}

interface PersistedSession {
  refreshToken: string
  user: User
}

const STORAGE_KEY = 'vesti.session.v1'

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  user: null,
  accessToken: null,
  endedBy: null,
}))

async function readPersisted(): Promise<PersistedSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSession>
    return parsed.refreshToken && parsed.user ? (parsed as PersistedSession) : null
  } catch {
    return null
  }
}

async function persist(session: PersistedSession): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session))
}

/** Incrementado a cada login/logout: resultados de refresh iniciados antes são descartados. */
let generation = 0

async function clearSession(endedBy: 'user' | 'expired' = 'expired'): Promise<void> {
  generation += 1
  useSession.setState({ status: 'anonymous', user: null, accessToken: null, endedBy })
  await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {})
}

async function startSession({ user, tokens }: AuthResponse): Promise<void> {
  generation += 1
  await persist({ refreshToken: tokens.refreshToken, user })
  useSession.setState({ status: 'authenticated', user, accessToken: tokens.accessToken, endedBy: null })
}

let refreshing: Promise<string | null> | null = null

/**
 * Renova o access token (single-flight: chamadas concorrentes compartilham a mesma requisição,
 * evitando que a rotação dispare a detecção de reuso no servidor).
 * Encerra a sessão apenas se o servidor rejeitar o refresh token; falha de rede é propagada.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const startedAt = generation
    const saved = await readPersisted()
    if (!saved) {
      await clearSession()
      return null
    }
    try {
      const { tokens } = await authApi.refresh(saved.refreshToken)
      // Logout (ou novo login) aconteceu durante o refresh: não ressuscitar a sessão antiga.
      if (generation !== startedAt) return null
      await persist({ refreshToken: tokens.refreshToken, user: saved.user })
      useSession.setState({ status: 'authenticated', accessToken: tokens.accessToken })
      return tokens.accessToken
    } catch (error) {
      if (isApiError(error) && error.status === 401 && generation === startedAt) {
        await clearSession()
        return null
      }
      throw error
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

setAuthBridge({
  getAccessToken: () => useSession.getState().accessToken,
  refreshAccessToken,
})

export const session = {
  /**
   * Restaura a sessão salva sem depender de rede: o app abre mesmo offline.
   * O token é renovado sob demanda na primeira chamada autenticada.
   */
  async bootstrap(): Promise<void> {
    const saved = await readPersisted()
    useSession.setState(
      saved ? { status: 'authenticated', user: saved.user } : { status: 'anonymous', user: null },
    )
  },

  async signIn(input: { email: string; password: string }): Promise<User> {
    const response = await authApi.login(input)
    await startSession(response)
    return response.user
  },

  async signUp(input: { name: string; email: string; password: string }): Promise<User> {
    const response = await authApi.register(input)
    await startSession(response)
    return response.user
  },

  /** Revoga no servidor (melhor esforço) e limpa o dispositivo mesmo offline. */
  async signOut(): Promise<void> {
    const saved = await readPersisted()
    await clearSession('user')
    if (saved) await authApi.logout(saved.refreshToken).catch(() => {})
  },
}
