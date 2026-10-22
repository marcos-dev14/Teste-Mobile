import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { PaymentMethod } from '@/lib/api/types'

interface CheckoutState {
  addressId: string | null
  paymentMethod: PaymentMethod
  /** CPF/CNPJ para Pix/boleto. Só em memória: nunca persistido; apagado ao sair do checkout. */
  taxId: string
  /**
   * Chave de idempotência vinculada ao conteúdo do pedido (ver `idempotencyKeyFor`). Persistida:
   * se a resposta da criação se perder e o app for fechado, a nova tentativa da MESMA compra
   * reaproveita a chave e o servidor devolve o pedido já criado em vez de duplicá-lo.
   */
  idempotency: { key: string; signature: string } | null
  setAddress: (id: string | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setTaxId: (taxId: string) => void
  /** Descarta o CPF/CNPJ (ao sair do checkout), mantendo a chave da compra em andamento. */
  clearTaxId: () => void
  /** Encerra a compra: após o pedido criado, ou ao sair da conta. */
  reset: () => void
}

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      addressId: null,
      paymentMethod: 'credit_card',
      taxId: '',
      idempotency: null,
      setAddress: (addressId) => set({ addressId }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setTaxId: (taxId) => set({ taxId }),
      clearTaxId: () => set({ taxId: '' }),
      reset: () => set({ addressId: null, paymentMethod: 'credit_card', taxId: '', idempotency: null }),
    }),
    {
      name: 'vesti.checkout-intent.v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Só a chave e a assinatura (ids e quantidades). Nada pessoal: o CPF nunca vai para o disco.
      partialize: (state) => ({ idempotency: state.idempotency }),
    },
  ),
)

/**
 * Reutiliza a mesma chave enquanto o conteúdo do pedido não muda: uma nova tentativa após
 * falha de rede — mesmo depois de reabrir o app — não duplica o pedido. Se o conteúdo mudar,
 * gera chave nova (o servidor rejeitaria a chave antiga com outro conteúdo).
 */
export function idempotencyKeyFor(signature: string): string {
  const current = useCheckout.getState().idempotency
  if (current?.signature === signature) return current.key
  const key = Crypto.randomUUID()
  useCheckout.setState({ idempotency: { key, signature } })
  return key
}
