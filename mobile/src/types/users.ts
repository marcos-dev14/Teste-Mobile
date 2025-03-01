import type { AddressParams } from "./address"

export interface UserParams {
  id: string
  name: string
  email: string
  address: AddressParams[]
}

export interface UserLoginParams {
  email: string
  password: string
}

export interface UserRegisterParams {
  name: string
  email: string
  password: string
}

export interface UserLoginResponse {
  message: string
  user: {
    id: string
    name: string
    email: string
  }
}