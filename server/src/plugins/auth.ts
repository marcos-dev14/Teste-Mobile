import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { unauthorized } from '../lib/errors.js'

const ISSUER = 'mp-ecommerce-api'
const AUDIENCE = 'mp-ecommerce-app'

interface AccessTokenPayload {
  sub: string
  typ: 'access'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload
    user: AccessTokenPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Hook `onRequest` que exige um access token válido e popula `request.user`. */
    authenticate: (request: FastifyRequest) => Promise<void>
    signAccessToken: (userId: string) => string
  }
}

export interface AuthPluginOptions {
  secret: string
  accessTokenTtlSeconds: number
}

export const authPlugin = fp<AuthPluginOptions>(async (app: FastifyInstance, options) => {
  await app.register(jwt, {
    secret: options.secret,
    sign: { algorithm: 'HS256', iss: ISSUER, aud: AUDIENCE, expiresIn: options.accessTokenTtlSeconds },
    verify: { algorithms: ['HS256'], allowedIss: ISSUER, allowedAud: AUDIENCE },
  })

  app.decorate('signAccessToken', (userId: string) => app.jwt.sign({ sub: userId, typ: 'access' }))

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<AccessTokenPayload>()
      if (payload.typ !== 'access' || typeof payload.sub !== 'string') throw new Error('invalid token type')
    } catch {
      throw unauthorized('Sessão inválida ou expirada.', 'INVALID_TOKEN')
    }
  })
})
