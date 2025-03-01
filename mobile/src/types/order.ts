export interface OrderParams {
  userId: string | undefined
  addressId: string | undefined
  items: {
    productId: string
    quantity: number
    price: number
  }[]
  totalItems: number
  totalPrice: number
}