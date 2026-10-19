import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'

import { AppError, type ErrorDetail } from '../lib/errors.js'

interface ErrorBody {
  error: { code: string; message: string; details?: ErrorDetail[]; requestId: string }
}

function send(reply: FastifyReply, request: FastifyRequest, status: number, body: Omit<ErrorBody['error'], 'requestId'>) {
  const payload: ErrorBody = { error: { ...body, requestId: request.id } }
  // Erros não passam pelo serializer de resposta da rota.
  return reply.status(status).type('application/json').serializer(JSON.stringify).send(payload)
}

const FASTIFY_CLIENT_ERRORS: Record<string, { code: string; message: string }> = {
  FST_ERR_CTP_BODY_TOO_LARGE: { code: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição muito grande.' },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type não suportado.' },
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: { code: 'BAD_REQUEST', message: 'Content-Length inválido.' },
  FST_ERR_CTP_EMPTY_JSON_BODY: { code: 'BAD_REQUEST', message: 'Corpo JSON vazio.' },
  FST_ERR_CTP_INVALID_JSON_BODY: { code: 'BAD_REQUEST', message: 'JSON inválido.' },
}

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError | AppError | z.ZodError, request, reply) => {
    if (error instanceof AppError) {
      return send(reply, request, error.statusCode, {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      })
    }

    // Erro de validação (o validatorCompiler devolve o ZodError; o Fastify anexa o contexto).
    if (error instanceof z.ZodError) {
      const context = (error as z.ZodError & { validationContext?: string }).validationContext
      return send(reply, request, 400, {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: error.issues.map((issue) => ({
          path: [context, ...issue.path].filter((part) => part !== undefined).join('.'),
          message: issue.message,
        })),
      })
    }

    if ('code' in error && typeof error.code === 'string' && FASTIFY_CLIENT_ERRORS[error.code]) {
      return send(reply, request, error.statusCode ?? 400, FASTIFY_CLIENT_ERRORS[error.code]!)
    }

    const status = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500
    if (status >= 400 && status < 500) {
      request.log.info({ err: error }, 'client error')
      return send(reply, request, status, { code: 'BAD_REQUEST', message: 'Requisição inválida.' })
    }

    request.log.error({ err: error }, 'unhandled error')
    return send(reply, request, 500, {
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro inesperado. Tente novamente.',
    })
  })

  app.setNotFoundHandler((request, reply) =>
    send(reply, request, 404, { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' }),
  )
})
