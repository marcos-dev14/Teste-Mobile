export interface ErrorDetail {
  path?: string
  message: string
  [key: string]: unknown
}

/** Erro esperado de domínio/HTTP. O handler central o converte no formato padrão de resposta. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const badRequest = (code: string, message: string, details?: ErrorDetail[]) =>
  new AppError(400, code, message, details)

export const unauthorized = (message = 'Autenticação necessária.', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message)

export const notFound = (message = 'Recurso não encontrado.', code = 'NOT_FOUND') =>
  new AppError(404, code, message)

export const conflict = (code: string, message: string, details?: ErrorDetail[]) =>
  new AppError(409, code, message, details)
