import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_ITEMS_STORAGE_KEY = "@myDemoApp:cart";

interface CartItemsProps {
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


async function save(cartItems: CartItemsProps[]) {
  try {
    const cartItemsJson = JSON.stringify(cartItems);

    await AsyncStorage.setItem(CART_ITEMS_STORAGE_KEY, cartItemsJson);
  } catch (error) {
    throw new Error("Erro ao salvar o item no LocalStore: " + error);
  }
}

async function get(): Promise<CartItemsProps[] | null> {
  try {
    const cartItemsJson = await AsyncStorage.getItem(CART_ITEMS_STORAGE_KEY);

    return cartItemsJson ? JSON.parse(cartItemsJson) : null;
  } catch (error) {
    throw new Error("Erro ao buscar o item no LocalStore: " + error);
  }
}

async function remove() {
  try {
    await AsyncStorage.removeItem(CART_ITEMS_STORAGE_KEY);
  } catch (error) {
    throw new Error("Erro ao remover o item no LocalStore: " + error);
  }
}

export const cartItemsStorage = { save, get, remove };