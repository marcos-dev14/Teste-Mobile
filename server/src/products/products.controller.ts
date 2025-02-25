import { Controller, Get, Param } from '@nestjs/common';
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
}