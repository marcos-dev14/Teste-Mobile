import AsyncStorage from '@react-native-async-storage/async-storage'

export const USER_STATE_STORAGE_KEY = "@teste_mobile:cart_items"
export async function saveCartItem(cart_items: string) {
  try {
    await AsyncStorage.setItem(USER_STATE_STORAGE_KEY, cart_items)
  } catch (e) {
    console.error('Error saving cart items', e)
  }
} 

export async function getCartItem() {
  try {
    const cart_items = await AsyncStorage.getItem(USER_STATE_STORAGE_KEY)
    return cart_items ? JSON.parse(cart_items) : []
  } catch (e) {
    console.error('Error retrieving cart items', e)
    return []
  }
}

export async function removeCartItem() {
  try {
    await AsyncStorage.removeItem(USER_STATE_STORAGE_KEY)
  } catch (e) {
    console.error('Error removing cart items', e)
  }
}