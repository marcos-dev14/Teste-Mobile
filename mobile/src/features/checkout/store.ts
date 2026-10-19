import * as Crypto from 'expo-crypto'
import { create } from 'zustand'

import type { PaymentMethod } from '@/lib/api/types'

interface CheckoutState {
  addressId: string | null
  paymentMethod: PaymentMethod
  /** Chave de idempotência vinculada ao conteúdo do pedido (ver `idempotencyKeyFor`). */
  idempotency: { key: string; signature: string } | null
  setAddress: (id: string) => void
  setPaymentMethod: (method: PaymentMethod) => void
  reset: () => void
}

export const useCheckout = create<CheckoutState>((set) => ({
  addressId: null,
  paymentMethod: 'pix',
  idempotency: null,
  setAddress: (addressId) => set({ addressId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  reset: () => set({ addressId: null, paymentMethod: 'pix', idempotency: null }),
}))

/**
 * Reutiliza a mesma chave enquanto o conteúdo do pedido não muda: uma nova tentativa após
 * falha de rede não duplica o pedido. Se o conteúdo mudar, gera chave nova (o servidor
 * rejeitaria a chave antiga com outro conteúdo).
 */
export function idempotencyKeyFor(signature: string): string {
  const current = useCheckout.getState().idempotency
  if (current?.signature === signature) return current.key
  const key = Crypto.randomUUID()
  useCheckout.setState({ idempotency: { key, signature } })
  return key
}
