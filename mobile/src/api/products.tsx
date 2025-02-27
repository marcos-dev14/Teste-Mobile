import type { ProductParams } from "@/types/product"
import { api } from "../lib/axios"

export async function getProducts() {
  const response = await api.get<ProductParams[]>("/products")

  return response.data
}

export async function getProductById(id: string) {
  const response = await api.get<ProductParams>(`/products/${id}`)

  return response.data
}