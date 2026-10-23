import type { FastifyBaseLogger } from 'fastify'

import type { Pool } from '../db/pool.js'
import { deleteExpiredRefreshTokens } from '../modules/auth/repository.js'
import type { PaymentsService } from '../modules/payments/service.js'

/** Dias após a expiração em que o refresh token ainda é mantido antes do descarte. */
export const EXPIRED_TOKEN_GRACE_DAYS = 7

export interface MaintenanceResult {
  expiredOrders: number
  refunds: number
  removedTokens: number | null
}

/**
 * Tarefas periódicas: expirar pedidos com reserva vencida, repetir reembolsos devidos e descartar
 * sessões expiradas. Roda no processo da API (intervalo) e também por `pnpm jobs:run`, para um
 * agendador externo — assim nada depende de a API estar no ar. Cada passo é idempotente e seguro
 * em execuções sobrepostas.
 */
export async function runMaintenance(
  deps: { pool: Pool; payments: PaymentsService; log: FastifyBaseLogger },
  options: { cleanupTokens: boolean },
): Promise<MaintenanceResult> {
  const expiredOrders = await deps.payments.expireStale()
  const refunds = await deps.payments.retryRefunds()
  const removedTokens = options.cleanupTokens ? await deleteExpiredRefreshTokens(deps.pool, EXPIRED_TOKEN_GRACE_DAYS) : null
  if (expiredOrders || refunds || removedTokens) {
    deps.log.info({ expiredOrders, refunds, removedTokens }, 'maintenance run')
  }
  return { expiredOrders, refunds, removedTokens }
}
