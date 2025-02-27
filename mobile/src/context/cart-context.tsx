import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from "react-native"
import { saveCartItem, USER_STATE_STORAGE_KEY } from "@/storage/cart-storage"

interface CartItem {
  id: string
  name: string
  price: number
  rating?: number
  quantity: number
  image: string
}

interface CartContextProps {
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItemCart: (id: string) => void
}

interface CartProviderProps {
  children: ReactNode
}

const CartContext = createContext<CartContextProps>({} as CartContextProps)

export function CartContextProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([])

  function addToCart(item: CartItem) {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id)

    if (existingItem) {
      return Alert.alert(
        'Produto já adicionado',
        'Este produto já está no carrinho. Você pode ajustar a quantidade no carrinho.',
        [{ text: 'OK' }]
      )
    }

    setCart((prevCart) => [...prevCart, item])
    Alert.alert(
      'Produto adicionado',
      `${item.name} foi adicionado ao carrinho!`,
      [{ text: 'OK' }]
    )
  }

  function updateQuantity(id: string, quantity: number) {
    setCart((prevCart) =>
      prevCart.map((cartItem) => 
        cartItem.id === id 
          ? { ...cartItem, quantity: quantity }
          : cartItem
      )
    )
  }

  function removeItemCart(id: string) {
    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.id !== id));
  }

  async function saveCartItemLocalStorage() {
    try {
      await saveCartItem(JSON.stringify(cart))
    } catch (error) {
      console.error('Erro ao salvar o carrinho:', error);
    }
  }

  async function loadCartItemLocalStorage() {
    try {
      const savedCart = await AsyncStorage.getItem(USER_STATE_STORAGE_KEY)

      if (savedCart ) {
        setCart(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error('Erro ao recuperar o carrinho:', error);
    }
  }

  useEffect(() => {
    saveCartItemLocalStorage()
  }, [cart])

  useEffect(() => {
    loadCartItemLocalStorage()
  }, [])

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeItemCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  return context
}