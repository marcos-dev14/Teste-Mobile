import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {} 

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany();
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
    }));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
    };
  }

  async updateRating(productId: string, newRating: number): Promise<ProductDto> {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { rating: newRating },
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
    };
  }

  async getRating(productId: string): Promise<number | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { rating: true },
    });
    return product?.rating || null;
  }
}