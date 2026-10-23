import { randomUUID } from 'node:crypto'

import type { FastifyBaseLogger } from 'fastify'

import { isPgError, type Pool, type Queryable, UNIQUE_VIOLATION } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { AppError, conflict, unauthorized } from '../../lib/errors.js'
import { createLoginThrottle, type LoginThrottle } from '../../lib/login-throttle.js'
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/passwords.js'
import { generateRefreshToken, hashToken } from '../../lib/tokens.js'
import * as repo from './repository.js'
import type { DeleteAccountBody, LoginBody, RegisterBody, TokensDto, UserDto } from './schemas.js'

export interface AuthServiceDeps {
  pool: Pool
  log: FastifyBaseLogger
  signAccessToken: (userId: string) => string
  accessTokenTtlSeconds: number
  refreshTokenTtlDays: number
  /** Limite de falhas de login por e-mail (padrão: 5 em 15 min). */
  loginThrottle?: LoginThrottle
}

export const toUserDto = (user: repo.UserRecord): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
})

/**
 * Janela de tolerância para refresh duplicado (timeout do cliente, app encerrado antes de salvar).
 * Dentro dela, reapresentar o token anterior substitui o sucessor em vez de revogar a família.
 */
export const REFRESH_REUSE_GRACE_SECONDS = 30

const invalidCredentials = () => unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS')
const invalidRefresh = () => unauthorized('Sessão expirada. Entre novamente.', 'INVALID_REFRESH_TOKEN')

export function createAuthService(deps: AuthServiceDeps) {
  const { pool, log } = deps
  const throttle = deps.loginThrottle ?? createLoginThrottle()

  async function issueTokens(db: Queryable, userId: string, familyId: string): Promise<{ tokens: TokensDto; tokenId: string }> {
    const refreshToken = generateRefreshToken()
    const tokenId = await repo.insertRefreshToken(db, {
      userId,
      familyId,
      tokenHash: hashToken(refreshToken),
      ttlDays: deps.refreshTokenTtlDays,
    })
    return {
      tokenId,
      tokens: {
        tokenType: 'Bearer',
        accessToken: deps.signAccessToken(userId),
        expiresIn: deps.accessTokenTtlSeconds,
        refreshToken,
      },
    }
  }

  return {
    async register(input: RegisterBody): Promise<{ user: UserDto; tokens: TokensDto }> {
      const passwordHash = await hashPassword(input.password)
      try {
        return await withTransaction(pool, async (tx) => {
          const user = await repo.insertUser(tx, { name: input.name, email: input.email, passwordHash })
          const { tokens } = await issueTokens(tx, user.id, randomUUID())
          return { user: toUserDto(user), tokens }
        })
      } catch (error) {
        if (isPgError(error, UNIQUE_VIOLATION)) {
          throw conflict('EMAIL_IN_USE', 'Já existe uma conta com este e-mail.')
        }
        throw error
      }
    },

    async login(input: LoginBody): Promise<{ user: UserDto; tokens: TokensDto }> {
      const wait = throttle.retryAfter(input.email)
      if (wait > 0) {
        throw new AppError(429, 'TOO_MANY_LOGIN_ATTEMPTS', `Muitas tentativas para esta conta. Tente novamente em ${Math.ceil(wait / 60)} min.`)
      }
      const user = await repo.findUserByEmail(pool, input.email)
      // Sempre executa o scrypt para não revelar, pelo tempo de resposta, se o e-mail existe.
      const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()))
      if (!user || !valid) {
        throttle.recordFailure(input.email)
        throw invalidCredentials()
      }
      throttle.reset(input.email)
      const { tokens } = await issueTokens(pool, user.id, randomUUID())
      return { user: toUserDto(user), tokens }
    },

    /** Rotação com detecção de reuso: apresentar um token já rotacionado revoga a família inteira. */
    async refresh(refreshToken: string): Promise<TokensDto> {
      const outcome = await withTransaction(pool, async (tx) => {
        const current = await repo.findRefreshTokenForUpdate(tx, hashToken(refreshToken), REFRESH_REUSE_GRACE_SECONDS)
        if (!current) return { kind: 'invalid' as const }
        if (
          current.revoked &&
          current.rotatedWithinGrace &&
          current.replacedBy &&
          !current.expired &&
          // Reconfere com o sucessor travado: um refresh concorrente pode tê-lo rotacionado.
          (await repo.lockActiveRefreshToken(tx, current.replacedBy))
        ) {
          // Duplicata benigna: o sucessor emitido há instantes nunca chegou ao cliente. Ele é substituído.
          const { tokens, tokenId } = await issueTokens(tx, current.userId, current.familyId)
          await repo.markRefreshTokenRotated(tx, current.replacedBy, tokenId)
          return { kind: 'ok' as const, tokens }
        }
        if (current.revoked) {
          const revoked = await repo.revokeRefreshTokenFamily(tx, current.familyId)
          return { kind: 'reused' as const, userId: current.userId, revoked }
        }
        if (current.expired) return { kind: 'invalid' as const }

        const { tokens, tokenId } = await issueTokens(tx, current.userId, current.familyId)
        await repo.markRefreshTokenRotated(tx, current.id, tokenId)
        return { kind: 'ok' as const, tokens }
      })

      if (outcome.kind === 'ok') return outcome.tokens
      if (outcome.kind === 'reused') {
        log.warn({ userId: outcome.userId, revoked: outcome.revoked }, 'refresh token reuse detected; family revoked')
      }
      throw invalidRefresh()
    },

    async logout(refreshToken: string): Promise<void> {
      await withTransaction(pool, async (tx) => {
        const current = await repo.findRefreshTokenForUpdate(tx, hashToken(refreshToken))
        if (current) await repo.revokeRefreshTokenFamily(tx, current.familyId)
      })
    },

    async getProfile(userId: string): Promise<UserDto> {
      const user = await repo.findUserById(pool, userId)
      // Usuário removido com token ainda válido.
      if (!user) throw unauthorized('Sessão inválida ou expirada.', 'INVALID_TOKEN')
      return toUserDto(user)
    },

    /**
     * Exclusão de conta (LGPD): exige a senha; recusa se houver pedido em andamento (aguardando
     * pagamento, pago ou enviado), que ainda depende do contato do cliente. Apaga endereços e
     * sessões e anonimiza a conta; os pedidos ficam pelo prazo legal de guarda.
     */
    async deleteAccount(userId: string, input: DeleteAccountBody): Promise<void> {
      const user = await repo.findUserById(pool, userId)
      if (!user) throw unauthorized('Sessão inválida ou expirada.', 'INVALID_TOKEN')
      // Fora da transação: o scrypt é caro e não deve segurar a trava da conta.
      // 403 (e não 401): senha errada aqui não significa sessão inválida para o app.
      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new AppError(403, 'INVALID_PASSWORD', 'Senha incorreta.')
      }
      await withTransaction(pool, async (tx) => {
        // A trava também bloqueia pedidos novos da conta até o fim (FK de orders → users).
        if (!(await repo.lockActiveUser(tx, userId))) throw unauthorized('Sessão inválida ou expirada.', 'INVALID_TOKEN')
        if ((await repo.countOrdersInProgress(tx, userId)) > 0) {
          throw conflict(
            'ACCOUNT_HAS_ORDERS_IN_PROGRESS',
            'Você tem pedidos em andamento. Cancele os que aguardam pagamento ou aguarde a entrega para excluir a conta.',
          )
        }
        await repo.anonymizeUser(tx, userId)
      })
      log.info({ userId }, 'account deleted')
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
