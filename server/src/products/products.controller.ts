import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ProductsService } from './products.service'; 
import { ProductDto } from './dto/product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {} 

  @Get()
  async findAll(): Promise<ProductDto[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new Error('Produto não encontrado'); 
    }
    return product;
  }

  @Patch(':id/rating') 
  async updateRating(
    @Param('id') productId: string,
    @Body('rating') rating: number,
  ): Promise<ProductDto> {
    return this.productsService.updateRating(productId, rating);
  }

  @Get(':id/rating')
  async getRating(@Param('id') productId: string): Promise<number | null> {
    return this.productsService.getRating(productId);
  }
}