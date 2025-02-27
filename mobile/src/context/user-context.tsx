import { createContext, useContext, useState, ReactNode, useEffect } from "react"

import { userStorage } from "@/storage/user"

interface UserProps {
  id: string
  name: string
  email: string
}

interface UserContextProps {
  user: UserProps | null
  saveUserData: (userData: UserProps) => void
  logout: () => void
}

interface UserProviderProps {
  children: ReactNode
}

const UserContext = createContext<UserContextProps>({} as UserContextProps)

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<UserProps | null>(null)

  async function saveUserData(userData: UserProps) {
    setUser(userData)
    await userStorage.save(userData)
  }

  async function logout() {
    setUser(null)
    await userStorage.remove(); 
  }

  async function loadUserData() {
    const storedUser = await userStorage.get()
    if (storedUser) {
      setUser(storedUser)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  return (
    <UserContext.Provider value={{ user, saveUserData, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  return context
}