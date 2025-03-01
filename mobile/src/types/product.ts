export interface ProductColorsProps {
  id: string;
  name: string
  hex: string
  images: string[]
}

export interface ProductParams {
  id: string
  name: string
  price: number
  images: string[]
  rating?: number
  colors: ProductColorsProps[]
}