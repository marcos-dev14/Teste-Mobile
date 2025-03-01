import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Alert } from "react-native"

import { cartItemsStorage } from "@/storage/cart-storage"

interface CartItem {
  id: string
  name: string
  price: number
  rating?: number
  quantity: number
  image: string
  color: {
    id: string;
    name: string;
    hex: string;
    images: string[];
  };
}

interface CartContextProps {
  cart: CartItem[]
  totalPrice: number
  addToCart: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItemCart: (id: string) => void
  clearCart: () => void
}

interface CartProviderProps {
  children: ReactNode
}

const CartContext = createContext<CartContextProps>({} as CartContextProps)

export function CartContextProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true);

  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0)

  function addToCart(item: CartItem) {
    const existingItem = cart.find((cartItem) => cartItem.color.id === item.color.id)

    if (existingItem) {
      return Alert.alert(
        'Produto já adicionado',
        'Este produto já está no carrinho. Você pode ajustar a quantidade no carrinho.',
        [{ text: 'OK' }]
      )
    }

    setCart((prevCart) => [...prevCart, item]);
    Alert.alert(
      'Produto adicionado',
      `${item.name} da cor ${item.color.name} foi adicionado ao carrinho!`,
      [{ text: 'OK' }]
    )
  }

  function updateQuantity(id: string, quantity: number) {
    setCart((prevCart) =>
      prevCart.map((cartItem) =>
        cartItem.color.id === id
          ? { ...cartItem, quantity: quantity }
          : cartItem
      )
    );
  }

  function removeItemCart(id: string) {
    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.color.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  async function saveCartItemLocalStorage(cartItems: CartItem[]) {
    try {
      await cartItemsStorage.save(cartItems);
    } catch (error) {
      console.error('Erro ao salvar o carrinho:', error);
    }
  }

  useEffect(() => {
    async function loadCartItemLocalStorage() {
      setLoading(true);
      const cartItems = await cartItemsStorage.get();
      
      if (cartItems) {
        setCart(cartItems);
      }
      setLoading(false);
    }
  
    loadCartItemLocalStorage();
  }, []);

  useEffect(() => {
    if (!loading) {
      saveCartItemLocalStorage(cart);
    }
  }, [cart, loading]);

  return (
    <CartContext.Provider value={{
      cart,
      totalPrice,
      addToCart,
      updateQuantity,
      removeItemCart,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  return context;
}