import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { addItem, countItems, removeItem, setQuantity, type CartItem } from './cart-logic'

interface CartState {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>, quantity: number) => void
  setQuantity: (colorId: string, quantity: number) => void
  remove: (colorId: string) => void
  clear: () => void
}

// Carrinho não contém dado sensível: AsyncStorage é adequado (tokens ficam no SecureStore).
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, quantity) => set((state) => ({ items: addItem(state.items, item, quantity) })),
      setQuantity: (colorId, quantity) => set((state) => ({ items: setQuantity(state.items, colorId, quantity) })),
      remove: (colorId) => set((state) => ({ items: removeItem(state.items, colorId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'vesti.cart.v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)

/** Seletor granular: só re-renderiza quem usa a contagem quando ela muda. */
export const useCartCount = () => useCartStore((state) => countItems(state.items))
