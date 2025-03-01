import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './dto/product.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDto> {
    const product = await this.prisma.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description || '',
        price: createProductDto.price,
        images: createProductDto.images,
        rating: createProductDto.rating,
        colors: {
          create: createProductDto.colors.map((color) => ({
            name: color.name,
            hex: color.hex,
            images: color.images,
          })),
        },
      },
      include: { colors: true },
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
      colors: product.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        images: color.images,
        createdAt: color.createdAt,
        updatedAt: color.updatedAt,
      })),
    };
  }

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      include: { colors: true },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
      colors: product.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        images: color.images, // Inclui as imagens das cores
        createdAt: color.createdAt,
        updatedAt: color.updatedAt,
      })),
    }));
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { colors: true },
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
      colors: product.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        images: color.images,
        createdAt: color.createdAt,
        updatedAt: color.updatedAt,
      })),
    };
  }

  async updateRating(productId: string, newRating: number): Promise<ProductDto> {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { rating: newRating },
      include: { colors: true },
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      rating: product.rating || undefined,
      colors: product.colors.map((color) => ({
        id: color.id,
        name: color.name,
        hex: color.hex,
        images: color.images,
        createdAt: color.createdAt,
        updatedAt: color.updatedAt,
      })),
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