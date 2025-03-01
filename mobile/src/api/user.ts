import { api } from "@/lib/axios"

import type { UserLoginParams, UserLoginResponse, UserParams, UserRegisterParams } from "@/types/users"

export async function userRegister(userRegisterData: UserRegisterParams) {
  const response = await api.post<UserParams>("/users/register", userRegisterData)

  return response.data
}

export async function userLogin(userLoginData: UserLoginParams) {
  const response = await api.post<UserLoginResponse>("/users/login", userLoginData)

  return response.data
}

export async function getUser(userId: string) {
  const response = await api.get<UserParams>(`/users/${userId}`)

  return response.data
}