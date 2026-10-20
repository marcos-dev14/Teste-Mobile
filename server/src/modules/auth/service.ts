import { randomUUID } from 'node:crypto'

import type { FastifyBaseLogger } from 'fastify'

import { isPgError, type Pool, type Queryable, UNIQUE_VIOLATION } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { conflict, unauthorized } from '../../lib/errors.js'
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/passwords.js'
import { generateRefreshToken, hashToken } from '../../lib/tokens.js'
import * as repo from './repository.js'
import type { LoginBody, RegisterBody, TokensDto, UserDto } from './schemas.js'

export interface AuthServiceDeps {
  pool: Pool
  log: FastifyBaseLogger
  signAccessToken: (userId: string) => string
  accessTokenTtlSeconds: number
  refreshTokenTtlDays: number
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
      const user = await repo.findUserByEmail(pool, input.email)
      // Sempre executa o scrypt para não revelar, pelo tempo de resposta, se o e-mail existe.
      const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()))
      if (!user || !valid) throw invalidCredentials()
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
  }
}

export type AuthService = ReturnType<typeof createAuthService>
