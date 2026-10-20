import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import { useCartStore } from '@/features/cart/store'
import { idempotencyKeyFor, useCheckout } from '@/features/checkout/store'
import { assertSecureInRelease } from '@/lib/env'

import { safeRedirect } from '../require-auth'
import { useSession } from '../session-store'
import { useSessionCleanup } from '../use-session-cleanup'

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', createdAt: '2026-01-01T00:00:00.000Z' }
const cartItem = {
  productId: 'p1',
  colorId: 'c1',
  snapshot: { name: 'Camiseta', colorName: 'Branco', colorHex: '#FFFFFF', imageUrl: 'https://x/y.jpg', priceCents: 2999 },
}

describe('idempotencyKeyFor', () => {
  beforeEach(() => useCheckout.getState().reset())

  it('reutiliza a chave para o mesmo conteúdo (retentativa não duplica pedido)', () => {
    expect(idempotencyKeyFor('pedido-A')).toBe(idempotencyKeyFor('pedido-A'))
  })

  it('gera chave nova quando o conteúdo muda', () => {
    const first = idempotencyKeyFor('pedido-A')
    expect(idempotencyKeyFor('pedido-B')).not.toBe(first)
  })
})

describe('safeRedirect', () => {
  it.each(['/checkout/address', '/orders', '/'])('aceita rota interna %s', (path) => {
    expect(safeRedirect(path)).toBe(path)
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', 'checkout', 42, undefined])(
    'rejeita destino externo ou malformado %p',
    (value) => {
      expect(safeRedirect(value)).toBe('/')
    },
  )
})

describe('assertSecureInRelease', () => {
  it('permite HTTP apenas em desenvolvimento', () => {
    expect(assertSecureInRelease('http://10.0.2.2:3333', true)).toBe('http://10.0.2.2:3333')
    expect(() => assertSecureInRelease('http://api.example.com', false)).toThrow()
    expect(assertSecureInRelease('https://api.example.com', false)).toBe('https://api.example.com')
  })
})

describe('useSessionCleanup', () => {
  function setup() {
    const client = new QueryClient()
    client.setQueryData(['user', 'u1', 'orders'], { data: ['pedido'] })
    client.setQueryData(['products', 'list'], { data: ['produto'] })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return { client, ...renderHook(() => useSessionCleanup(), { wrapper }) }
  }

  beforeEach(() => {
    useCartStore.setState({ items: [{ ...cartItem, quantity: 1 }] })
    useCheckout.setState({ addressId: 'a1' })
  })

  it('ao sair, remove dados do usuário, checkout e sacola, mas mantém o catálogo', () => {
    useSession.setState({ status: 'authenticated', user, accessToken: 't' })
    const { client } = setup()

    act(() => useSession.setState({ status: 'anonymous', user: null, accessToken: null, endedBy: 'user' }))

    expect(client.getQueryData(['user', 'u1', 'orders'])).toBeUndefined()
    expect(client.getQueryData(['products', 'list'])).toBeDefined()
    expect(useCheckout.getState().addressId).toBeNull()
    expect(useCartStore.getState().items).toEqual([])
  })

  it('sessão expirada (refresh recusado) mantém a sacola para continuar a compra após novo login', () => {
    useSession.setState({ status: 'authenticated', user, accessToken: 't' })
    const { client } = setup()

    act(() => useSession.setState({ status: 'anonymous', user: null, accessToken: null, endedBy: 'expired' }))

    expect(client.getQueryData(['user', 'u1', 'orders'])).toBeUndefined()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('abrir o app como anônimo não apaga a sacola', () => {
    useSession.setState({ status: 'anonymous', user: null, accessToken: null })
    setup()
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
