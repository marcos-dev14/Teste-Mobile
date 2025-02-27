import AsyncStorage from "@react-native-async-storage/async-storage"

const USER_STORAGE_KEY = "@teste_mobile:user"

interface UserProps {
  id: string;
  name: string;
  email: string;
}

async function save(user: UserProps) {
  try {
    const userJson = JSON.stringify(user)
    await AsyncStorage.setItem(USER_STORAGE_KEY, userJson)
  } catch (error) {
    throw new Error("Erro ao salvar o usuário: " + error)
  }
}

async function get(): Promise<UserProps | null> {
  try {
    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY)
    return userJson ? JSON.parse(userJson) : null
  } catch (error) {
    throw new Error("Erro ao buscar o usuário: " + error)
  }
}

async function remove() {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY)
  } catch (error) {
    throw new Error("Erro ao remover o usuário: " + error)
  }
}

export const userStorage = { save, get, remove }
