import type { ApiErrorBody } from './types'

export type ApiErrorKind = 'http' | 'network' | 'timeout'

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>[],
    readonly requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static fromBody(status: number, body: ApiErrorBody | null): ApiError {
    if (body?.error) {
      const { code, message, details, requestId } = body.error
      return new ApiError('http', status, code, message, details, requestId)
    }
    return new ApiError('http', status, 'UNKNOWN', 'Resposta inesperada do servidor.')
  }

  get isClientError() {
    return this.kind === 'http' && this.status >= 400 && this.status < 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Mensagem segura e em português para exibir ao usuário. */
export function describeError(error: unknown): { title: string; message: string } {
  if (isApiError(error)) {
    if (error.kind === 'network') {
      return {
        title: 'Sem conexão',
        message: 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.',
      }
    }
    if (error.kind === 'timeout') {
      return { title: 'Demorou demais', message: 'O servidor não respondeu a tempo. Tente de novo.' }
    }
    if (error.status === 429) return { title: 'Muitas tentativas', message: error.message }
    if (error.status >= 500) {
      return { title: 'Algo deu errado', message: 'Tivemos um problema do nosso lado. Tente novamente em instantes.' }
    }
    return { title: 'Não foi possível concluir', message: error.message }
  }
  return { title: 'Algo deu errado', message: 'Ocorreu um erro inesperado. Tente novamente.' }
}
