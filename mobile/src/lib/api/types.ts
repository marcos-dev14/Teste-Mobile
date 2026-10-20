/**
 * Contrato da API v1. Espelha os schemas de resposta do servidor
 * (server/src/modules/*\/schemas.ts). Valores monetários em centavos.
 */

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>[]
    requestId: string
  }
}

// Auth --------------------------------------------------------------------------

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Tokens {
  tokenType: 'Bearer'
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export interface AuthResponse {
  user: User
  tokens: Tokens
}

// Catálogo ------------------------------------------------------------------------

export type ProductSort = 'featured' | 'price_asc' | 'price_desc' | 'newest'

export interface ColorSummary {
  id: string
  name: string
  hex: string
}

export interface ProductSummary {
  id: string
  slug: string
  name: string
  priceCents: number
  rating: number | null
  imageUrl: string
  colors: ColorSummary[]
  inStock: boolean
}

export interface ProductColor extends ColorSummary {
  imageUrls: string[]
  stock: number
}

export interface ProductDetail {
  id: string
  slug: string
  name: string
  description: string
  priceCents: number
  rating: number | null
  imageUrls: string[]
  colors: ProductColor[]
  inStock: boolean
}

export interface Paginated<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

// Carrinho --------------------------------------------------------------------------

export interface PurchaseItem {
  productId: string
  colorId: string
  quantity: number
}

export interface QuoteLine {
  productId: string
  colorId: string
  productName: string
  colorName: string
  colorHex: string
  imageUrl: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
  availableStock: number
  status: 'ok' | 'insufficient_stock'
}

export interface CartQuote {
  lines: QuoteLine[]
  unavailable: { productId: string; colorId: string }[]
  itemCount: number
  subtotalCents: number
  shippingCents: number
  totalCents: number
  isPurchasable: boolean
}

// Endereços ---------------------------------------------------------------------------

export interface Address {
  id: string
  fullName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zipCode: string
  country: string
  createdAt: string
}

export type NewAddress = Omit<Address, 'id' | 'createdAt'>

// Pedidos -----------------------------------------------------------------------------

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'
export type OrderStatus = 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderSummary {
  id: string
  number: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  itemCount: number
  totalCents: number
  createdAt: string
  previewImageUrls: string[]
}

export interface OrderItem {
  id: string
  productId: string
  colorId: string
  productName: string
  colorName: string
  colorHex: string
  imageUrl: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface OrderDetail extends Omit<OrderSummary, 'previewImageUrls'> {
  subtotalCents: number
  shippingCents: number
  shippingAddress: NewAddress
  items: OrderItem[]
}

export interface CreateOrderInput {
  addressId: string
  paymentMethod: PaymentMethod
  items: PurchaseItem[]
}
