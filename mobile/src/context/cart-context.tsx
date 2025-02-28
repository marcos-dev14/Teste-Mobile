import { cartItemsStorage } from "@/storage/cart-storage"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Alert } from "react-native"

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
    const existingItem = cart.find((cartItem) => cartItem.id === item.id)

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
    );
  }

  function removeItemCart(id: string) {
    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.id !== id));
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

  // async function loadCartItemLocalStorage() {
  //   const cartItems = await cartItemsStorage.get();

  //   console.log("CHEGOU AQUI: ", cartItems)

  //   if (cartItems) {
  //     setCart(cartItems);
  //   }
  // }

  // useEffect(() => {
  //   saveCartItemLocalStorage(cart);
  // }, [cart]);

  useEffect(() => {
    async function loadCartItemLocalStorage() {
      setLoading(true);
      const cartItems = await cartItemsStorage.get();
      
      console.log("CARRINHO CARREGADO: ", cartItems);
      
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