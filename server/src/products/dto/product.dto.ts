import { ProductColorDto } from './product-color.dto';

export class ProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  rating?: number;
  colors: ProductColorDto[]; 
}