import { env } from '../env'
import { ApiError } from './errors'
import type { ApiErrorBody } from './types'

/**
 * Integração com a sessão, registrada pelo módulo de autenticação.
 * Mantém o cliente HTTP independente de React e do store de sessão.
 */
export interface AuthBridge {
  getAccessToken(): string | null
  /** Renova a sessão (single-flight). Retorna o novo access token ou null se a sessão acabou. */
  refreshAccessToken(): Promise<string | null>
}

let authBridge: AuthBridge | null = null

export function setAuthBridge(bridge: AuthBridge | null) {
  authBridge = bridge
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  headers?: Record<string, string>
  /** Envia o access token e tenta renovar a sessão uma vez em caso de 401. */
  auth?: boolean
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${env.apiUrl}${path}`
  if (!query) return url
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return params.length ? `${url}?${params.join('&')}` : url
}

async function send(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller)

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (controller.signal.aborted) {
      throw new ApiError('timeout', 0, 'TIMEOUT', 'Tempo de resposta esgotado.')
    }
    throw new ApiError('network', 0, 'NETWORK_ERROR', 'Falha de conexão.')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let token = options.auth ? (authBridge?.getAccessToken() ?? null) : null

  // Sem access token em memória (app reaberto): renova antes da primeira chamada autenticada.
  if (options.auth && !token && authBridge) token = await authBridge.refreshAccessToken()
  if (options.auth && !token) {
    throw new ApiError('http', 401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.')
  }

  let response = await send(path, options, token)

  if (response.status === 401 && options.auth && authBridge) {
    const renewed = await authBridge.refreshAccessToken()
    if (renewed) response = await send(path, options, renewed)
  }

  const body = await parseBody(response)
  if (!response.ok) throw ApiError.fromBody(response.status, (body ?? null) as ApiErrorBody | null)
  return body as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  delete: <T = void>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
