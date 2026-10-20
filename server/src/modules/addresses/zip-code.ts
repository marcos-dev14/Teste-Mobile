import type { FastifyBaseLogger } from 'fastify'

import { BRAZILIAN_STATES, type ZipCodeLookupDto } from './schemas.js'

/**
 * Consulta de CEP em provedores gratuitos (ViaCEP, com BrasilAPI como fallback).
 * A chamada sai do servidor: o provedor recebe só o CEP, nunca o IP ou a identidade do usuário.
 * O resultado é conveniência para o formulário, não prova de que o endereço existe.
 */

/** Retorna null quando o CEP não existe; lança `ZipCodeLookupUnavailable` quando nenhum provedor respondeu. */
export type ZipCodeLookup = (digits: string) => Promise<ZipCodeLookupDto | null>

export class ZipCodeLookupUnavailable extends Error {}

type FetchLike = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<Response>

interface ProviderAddress {
  street?: unknown
  neighborhood?: unknown
  city?: unknown
  state?: unknown
}

interface Provider {
  name: string
  url: (digits: string) => string
  /** null = CEP inexistente para este provedor. */
  parse: (status: number, body: unknown) => ProviderAddress | null
}

const record = (body: unknown): Record<string, unknown> =>
  body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

const PROVIDERS: Provider[] = [
  {
    name: 'viacep',
    url: (digits) => `https://viacep.com.br/ws/${digits}/json/`,
    parse: (status, body) => {
      const data = record(body)
      // CEP inexistente: 200 com {"erro": true} (ou "true" em respostas antigas).
      if (status === 200 && (data.erro === true || data.erro === 'true')) return null
      if (status !== 200) throw new Error(`status ${status}`)
      return { street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }
    },
  },
  {
    name: 'brasilapi',
    url: (digits) => `https://brasilapi.com.br/api/cep/v1/${digits}`,
    parse: (status, body) => {
      if (status === 404) return null
      if (status !== 200) throw new Error(`status ${status}`)
      const data = record(body)
      return { street: data.street, neighborhood: data.neighborhood, city: data.city, state: data.state }
    },
  },
]

/** Normaliza texto de terceiros: só string, espaços colapsados, tamanho limitado ao do banco. */
function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max).trim()
  return text.length >= 2 ? text : null
}

const STATES = new Set<string>(BRAZILIAN_STATES)

function toDto(digits: string, raw: ProviderAddress): ZipCodeLookupDto | null {
  const city = clean(raw.city, 80)
  const state = typeof raw.state === 'string' ? raw.state.trim().toUpperCase() : ''
  // Sem cidade ou com UF desconhecida o resultado não ajuda o formulário: tratado como não encontrado.
  if (!city || !STATES.has(state)) return null
  return {
    zipCode: `${digits.slice(0, 5)}-${digits.slice(5)}`,
    street: clean(raw.street, 120),
    neighborhood: clean(raw.neighborhood, 80),
    city,
    state: state as ZipCodeLookupDto['state'],
  }
}

export interface ZipCodeLookupOptions {
  log: FastifyBaseLogger
  fetch?: FetchLike
  timeoutMs?: number
  /** Validade do cache para CEPs encontrados e não encontrados. */
  foundTtlMs?: number
  notFoundTtlMs?: number
  maxEntries?: number
  now?: () => number
}

export function createZipCodeLookup(options: ZipCodeLookupOptions): ZipCodeLookup {
  const {
    log,
    fetch: fetchFn = (url, init) => fetch(url, init),
    timeoutMs = 2500,
    foundTtlMs = 24 * 60 * 60_000,
    notFoundTtlMs = 60 * 60_000,
    maxEntries = 5000,
    now = Date.now,
  } = options

  // CEP → logradouro é dado público de referência: cache compartilhado, sem nada do usuário.
  const cache = new Map<string, { value: ZipCodeLookupDto | null; expiresAt: number }>()
  const inFlight = new Map<string, Promise<ZipCodeLookupDto | null>>()

  function remember(digits: string, value: ZipCodeLookupDto | null) {
    if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!)
    cache.set(digits, { value, expiresAt: now() + (value ? foundTtlMs : notFoundTtlMs) })
  }

  async function ask(provider: Provider, digits: string): Promise<ZipCodeLookupDto | null> {
    const response = await fetchFn(provider.url(digits), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json' },
    })
    const body: unknown = await response.json().catch(() => null)
    const raw = provider.parse(response.status, body)
    return raw ? toDto(digits, raw) : null
  }

  async function resolve(digits: string): Promise<ZipCodeLookupDto | null> {
    let answered = false
    for (const provider of PROVIDERS) {
      try {
        const result = await ask(provider, digits)
        answered = true
        // Base de um provedor pode não ter CEPs novos: "não encontrado" ainda consulta o próximo.
        if (result) return result
      } catch (error) {
        // O CEP não é registrado: só o provedor e o tipo de falha.
        const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'error'
        log.warn({ provider: provider.name, reason }, 'zip code provider failed')
      }
    }
    if (!answered) throw new ZipCodeLookupUnavailable()
    return null
  }

  return async (digits) => {
    const cached = cache.get(digits)
    if (cached && cached.expiresAt > now()) return cached.value

    // Consultas simultâneas do mesmo CEP compartilham uma única ida aos provedores.
    let pending = inFlight.get(digits)
    if (!pending) {
      pending = resolve(digits)
        .then((value) => {
          remember(digits, value)
          return value
        })
        .finally(() => inFlight.delete(digits))
      inFlight.set(digits, pending)
    }
    return pending
  }
}
