import { api } from '@/lib/api/client'
import type { AuthResponse, Tokens, User } from '@/lib/api/types'

export const authApi = {
  login: (input: { email: string; password: string }) => api.post<AuthResponse>('/v1/auth/login', input),
  register: (input: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/v1/auth/register', input),
  refresh: (refreshToken: string) =>
    api.post<{ tokens: Tokens }>('/v1/auth/refresh', { refreshToken }, { timeoutMs: 10_000 }),
  logout: (refreshToken: string) => api.post<void>('/v1/auth/logout', { refreshToken }, { timeoutMs: 5_000 }),
  me: () => api.get<User>('/v1/me', { auth: true }),
}
