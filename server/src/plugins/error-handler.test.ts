import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { serializerCompiler, validatorCompiler } from '../lib/zod-compiler.js'
import { errorHandlerPlugin } from './error-handler.js'

async function buildTestApp() {
  const app = Fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(errorHandlerPlugin)
  app.post('/echo', { schema: { body: z.object({ id: z.uuid() }).strict() } }, async () => ({ ok: true }))
  // Resposta que viola o próprio contrato: simula um bug do servidor.
  app.get('/broken', { schema: { response: { 200: z.object({ id: z.uuid() }) } } }, async () => ({ id: 'not-a-uuid' }))
  await app.ready()
  return app
}

describe('error handler', () => {
  it('entrada inválida → 400 VALIDATION_ERROR com caminho do campo', async () => {
    const app = await buildTestApp()
    const response = await app.inject({ method: 'POST', url: '/echo', payload: { id: 'x' } })
    expect(response.statusCode).toBe(400)
    expect(response.json().error).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ path: 'body.id' }] })
  })

  it('resposta fora do contrato → 500 genérico, sem expor campos', async () => {
    const app = await buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/broken' })
    expect(response.statusCode).toBe(500)
    expect(response.json().error.code).toBe('INTERNAL_ERROR')
    expect(response.json().error.details).toBeUndefined()
  })
})
