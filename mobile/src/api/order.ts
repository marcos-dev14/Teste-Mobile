import type { OrderParams } from "@/types/order"
import { api } from "../lib/axios"

export async function createOrder(orderData: OrderParams) {
  const response = await api.post<OrderParams>("/order", orderData)

  return response.data
}

export async function getOrder(userId: string | undefined) {
  const response = await api.get<OrderParams>(`/order/user/${userId}`)

  return response.data
}