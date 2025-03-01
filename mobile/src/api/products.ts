import { api } from "../lib/axios"

import type { ProductParams } from "@/types/product"

export async function getProducts() {
  const response = await api.get<ProductParams[]>("/products")

  return response.data
}

export async function getProductById(id: string) {
  const response = await api.get<ProductParams>(`/products/${id}`)

  return response.data
}