import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateOrderDto } from './dto/create-order.dto';
import type { OrderDto } from './dto/order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto): Promise<OrderDto> {
    const userAddress = await this.prisma.address.findFirst({
      where: { userId: createOrderDto.userId },
    });
  
    if (!userAddress) {
      throw new BadRequestException('O usuário não tem um endereço cadastrado.');
    }
  
    const order = await this.prisma.order.create({
      data: {
        userId: createOrderDto.userId,
        addressId: createOrderDto.addressId,
        items: JSON.stringify(createOrderDto.items),
        totalItems: createOrderDto.totalItems,
        totalPrice: createOrderDto.totalPrice,
      },
    });
  
    return {
      id: order.id,
      userId: order.userId,
      addressId: order.addressId,
      items: JSON.parse(order.items as string) || [],
      totalItems: order.totalItems,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async findAllByUser(userId: string): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
    });

    return orders.map((order) => ({
      id: order.id,
      userId: order.userId,
      addressId: order.addressId,
      items: JSON.parse(order.items as unknown as string) || [],
      totalItems: order.totalItems,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }
}