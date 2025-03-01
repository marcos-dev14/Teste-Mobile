import { api } from "../lib/axios"

import type { AddressParams } from "@/types/address"

export async function createAddress(addressData: AddressParams) {
  const response = await api.post<AddressParams>("/address", addressData)

  return response.data
}

export async function getAddress() {
  const response = await api.get<AddressParams>("/address")

  return response.data
}

export async function getAddressById(id: string) {
  const response = await api.get<AddressParams>(`/address/${id}`)

  return response.data
}

export async function getAddressByUserId(userId: string | undefined) {
  const response = await api.get<AddressParams[]>(`/address/user/${userId}`)

  return response.data
}