import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useCartStore } from '@/features/cart/store'
import { useCheckout } from '@/features/checkout/store'

import { useSession } from './session-store'

/**
 * Ao encerrar a sessão (usuário logado → nenhum), remove dados do usuário anterior (cache de
 * queries do usuário e checkout). A sacola só é apagada no logout explícito (aparelho compartilhado):
 * se a sessão apenas expirou, o usuário entra de novo e continua a compra.
 * Não age na abertura do app como anônimo.
 */
export function useSessionCleanup() {
  const client = useQueryClient()
  const userId = useSession((state) => state.user?.id ?? null)
  const previous = useRef(userId)

  useEffect(() => {
    const hadUser = previous.current !== null
    previous.current = userId
    if (userId !== null || !hadUser) return
    client.removeQueries({ queryKey: ['user'] })
    useCheckout.getState().reset()
    if (useSession.getState().endedBy === 'user') useCartStore.getState().clear()
  }, [userId, client])
}
