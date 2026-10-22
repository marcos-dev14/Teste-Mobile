import { randomUUID } from 'node:crypto'

import Fastify, { type FastifyRequest, type FastifyServerOptions } from 'fastify'
import { z } from 'zod'

import type { Env } from './config/env.js'
import type { Pool } from './db/pool.js'
import { serializerCompiler, validatorCompiler } from './lib/zod-compiler.js'
import { addressRoutes } from './modules/addresses/routes.js'
import { createAddressesService } from './modules/addresses/service.js'
import { runMaintenance } from './jobs/maintenance.js'
import { createZipCodeLookup, type ZipCodeLookup } from './modules/addresses/zip-code.js'
import { authRoutes } from './modules/auth/routes.js'
import { createAuthService } from './modules/auth/service.js'
import { cartRoutes } from './modules/cart/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { orderRoutes } from './modules/orders/routes.js'
import { createOrdersService } from './modules/orders/service.js'
import { createStripeGateway, type PaymentGateway } from './modules/payments/gateway.js'
import { paymentMethodRoutes, paymentRoutes, stripeWebhookRoutes } from './modules/payments/routes.js'
import { createPaymentsService, type PaymentsService } from './modules/payments/service.js'
import { productRoutes } from './modules/products/routes.js'
import { authPlugin } from './plugins/auth.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { securityPlugin } from './plugins/security.js'

declare module 'fastify' {
  interface FastifyInstance {
    paymentsService: PaymentsService
  }
}

export interface BuildAppOptions {
  env: Env
  pool: Pool
  logger?: FastifyServerOptions['logger']
  /** Substitui a consulta de CEP real (testes não acessam a rede). */
  zipCodeLookup?: ZipCodeLookup
  /** Substitui o Stripe (testes). */
  paymentGateway?: PaymentGateway
}

/** Intervalo da manutenção (expiração de pedidos, reembolsos devidos, descarte de sessões). */
const EXPIRATION_INTERVAL_MS = 60_000

/** Campos nunca registrados em log, mesmo que algum serializador futuro os inclua. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.refreshToken',
  'req.body.taxId',
  'res.headers["set-cookie"]',
]

/**
 * Erros no log sem os campos que o Postgres preenche com dados da linha (`detail`: "Failing row
 * contains (… nome, e-mail, endereço …)"), nem parâmetros de consulta.
 */
export function serializeError(error: Error): { type: string; message: string; stack: string; [key: string]: unknown } {
  const { code, statusCode } = error as Error & { code?: unknown; statusCode?: unknown }
  return { type: error.name, message: error.message, stack: error.stack ?? '', code, statusCode }
}

/** O CEP consultado não vai para o log: junto com o IP, indica onde a pessoa mora. */
export const maskLoggedUrl = (url: string) => url.replace(/(\/addresses\/zip-codes\/)[^/?#]+/, '$1[redacted]')

function defaultLogger(env: Env): FastifyServerOptions['logger'] {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    serializers: {
      err: serializeError,
      // Mesmos campos do serializer padrão do Fastify, com a URL mascarada.
      req: (request: FastifyRequest) => ({
        method: request.method,
        url: maskLoggedUrl(request.url),
        host: request.host,
        remoteAddress: request.ip,
        remotePort: request.socket?.remotePort,
      }),
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : {}),
  }
}

export async function buildApp({ env, pool, logger, zipCodeLookup, paymentGateway }: BuildAppOptions) {
  // Mensagens padrão de validação em português (as mensagens customizadas dos schemas têm precedência).
  z.config(z.locales.pt())

  const app = Fastify({
    logger: logger ?? defaultLogger(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    // Id gerado no servidor (não aceitamos o do cliente para não poluir logs).
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    routerOptions: { ignoreTrailingSlash: true },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  await app.register(errorHandlerPlugin)
  await app.register(securityPlugin, {
    corsOrigins: env.CORS_ORIGINS,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
  })
  await app.register(authPlugin, {
    secret: env.JWT_SECRET,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  })

  const authService = createAuthService({
    pool,
    log: app.log,
    signAccessToken: (userId) => app.signAccessToken(userId),
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  })
  const ordersService = createOrdersService({
    pool,
    paymentMethods: env.PAYMENT_METHODS,
    reservationMinutes: (method) =>
      method === 'boleto'
        ? // O boleto vence em dias e o Stripe confirma o pagamento até 1 dia útil depois.
          (env.BOLETO_EXPIRES_AFTER_DAYS + env.BOLETO_CONFIRMATION_GRACE_DAYS) * 24 * 60
        : env.PAYMENT_RESERVATION_MINUTES,
  })
  const gateway =
    paymentGateway ??
    createStripeGateway({
      // parseEnv já exige as chaves fora do ambiente de teste.
      secretKey: env.STRIPE_SECRET_KEY!,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    })
  const paymentsService = createPaymentsService({
    pool,
    gateway,
    log: app.log,
    boletoExpiresAfterDays: env.BOLETO_EXPIRES_AFTER_DAYS,
    allowTestTaxIds: env.NODE_ENV !== 'production',
  })
  // Exposto para a rotina de expiração (e para exercitá-la nos testes).
  app.decorate('paymentsService', paymentsService)
  const addressesService = createAddressesService({
    pool,
    zipCodeLookup: zipCodeLookup ?? createZipCodeLookup({ log: app.log }),
  })

  await app.register(healthRoutes(pool))
  await app.register(
    async (v1) => {
      await v1.register(authRoutes(authService))
      await v1.register(productRoutes(pool))
      await v1.register(cartRoutes(pool))
      await v1.register(addressRoutes(addressesService))
      await v1.register(orderRoutes(ordersService))
      await v1.register(paymentRoutes(paymentsService, ordersService))
      await v1.register(paymentMethodRoutes(ordersService, gateway.publishableKey.startsWith('pk_test_')))
      await v1.register(stripeWebhookRoutes(paymentsService))
    },
    { prefix: '/v1' },
  )

  // Uma instância: intervalo em processo. Com várias instâncias, a consulta já é segura
  // (cada pedido é travado e conferido), mas o ideal é um job agendado único.
  if (env.NODE_ENV !== 'test') {
    let timer: NodeJS.Timeout | undefined
    app.addHook('onReady', async () => {
      let runs = 0
      timer = setInterval(() => {
        runs += 1
        // Sessões expiradas: uma vez por hora basta (a política promete descarte em até 7 dias).
        runMaintenance({ pool, payments: paymentsService, log: app.log }, { cleanupTokens: runs % 60 === 1 }).catch(
          (error: unknown) => app.log.error({ err: error }, 'maintenance run failed'),
        )
      }, EXPIRATION_INTERVAL_MS)
      timer.unref()
    })
    app.addHook('onClose', async () => clearInterval(timer))
  }

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
