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
  /** Logradouro (rua, avenida…). */
  addressLine1: string
  /** Nulo apenas em endereços cadastrados antes do preenchimento por CEP. */
  number: string | null
  addressLine2: string | null
  neighborhood: string | null
  city: string
  state: string
  zipCode: string
  country: string
  createdAt: string
}

export type NewAddress = Omit<Address, 'id' | 'createdAt'>

/** Corpo de `POST /v1/addresses`: número e bairro são obrigatórios em endereços novos. */
export type CreateAddressInput = Omit<NewAddress, 'number' | 'neighborhood'> & { number: string; neighborhood: string }

/** Sugestão de `GET /v1/addresses/zip-codes/:zipCode` (dado de terceiro: sempre editável). */
export interface ZipCodeLookup {
  zipCode: string
  street: string | null
  neighborhood: string | null
  city: string
  state: string
}

// Pedidos -----------------------------------------------------------------------------

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto'
/** `placed`: pedidos anteriores à integração de pagamento. */
export type OrderStatus =
  | 'pending_payment'
  | 'placed'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired'
  | 'refunded'

/** Estado do PaymentIntent no Stripe, lido pelo servidor. */
export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'succeeded'
  | 'canceled'

/** Resposta de `POST /v1/orders/:id/payment`: o necessário para o painel de cartão (nunca dados de cartão). */
/** Instruções do Pix (QR Code e "copia e cola"), geradas pelo Stripe. */
export interface PixInstructions {
  qrCodeData: string
  qrCodeImageUrl: string
  hostedInstructionsUrl: string | null
  expiresAt: string
}

/** Boleto gerado pelo Stripe. */
export interface BoletoInstructions {
  number: string
  pdfUrl: string | null
  hostedVoucherUrl: string | null
  expiresAt: string
}

/** Resposta de `POST /v1/orders/:id/payment`, por método (nunca chave secreta nem dados do pagador). */
export type PaymentSession = { paymentIntentId: string; amountCents: number; currency: string } & (
  | { method: 'card'; clientSecret: string; publishableKey: string }
  | { method: 'pix'; pix: PixInstructions }
  | { method: 'boleto'; boleto: BoletoInstructions }
)

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
  /** Até quando os itens ficam reservados aguardando pagamento. */
  reservedUntil: string | null
  paymentStatus: PaymentStatus | null
  /** Código da última falha informada pelo Stripe (ex.: `card_declined`). */
  paymentFailureCode: string | null
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
