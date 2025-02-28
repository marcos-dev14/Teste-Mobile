import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import type { CreateOrderDto } from './dto/create-order.dto';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            address: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve criar um pedido com sucesso', async () => {
    const createOrderDto: CreateOrderDto = {
      userId: 'user-123',
      addressId: 'address-456',
      items: [{ productId: 'product-789', quantity: 2, price: 100 }],
      totalItems: 2,
      totalPrice: 200,
    };

    (prisma.address.findFirst as jest.Mock).mockResolvedValue({ id: 'address-456' });

    (prisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-001',
      userId: createOrderDto.userId,
      addressId: createOrderDto.addressId,
      items: JSON.stringify(createOrderDto.items),
      totalItems: createOrderDto.totalItems,
      totalPrice: createOrderDto.totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(createOrderDto);

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: {
        userId: createOrderDto.userId,
        addressId: createOrderDto.addressId,
        items: JSON.stringify(createOrderDto.items),
        totalItems: createOrderDto.totalItems,
        totalPrice: createOrderDto.totalPrice,
      },
    });

    expect(result).toEqual({
      id: 'order-001',
      userId: createOrderDto.userId,
      addressId: createOrderDto.addressId,
      items: createOrderDto.items,
      totalItems: createOrderDto.totalItems,
      totalPrice: createOrderDto.totalPrice,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('deve lançar um erro ao criar um pedido sem endereço cadastrado', async () => {
    const createOrderDto: CreateOrderDto = {
      userId: 'user-123',
      addressId: 'address-456',
      items: [{ productId: 'product-789', quantity: 2, price: 100 }],
      totalItems: 2,
      totalPrice: 200,
    };

    (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createOrderDto)).rejects.toThrow(
      new BadRequestException('O usuário não tem um endereço cadastrado.')
    );
  });

  it('deve retornar uma lista de pedidos para um usuário específico', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'order-001',
        userId: 'user-123',
        addressId: 'address-456',
        items: JSON.stringify([{ productId: 'product-789', quantity: 2, price: 100 }]),
        totalItems: 2,
        totalPrice: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findAllByUser('user-123');

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
    
    expect(result).toEqual([
      {
        id: 'order-001',
        userId: 'user-123',
        addressId: 'address-456',
        items: [{ productId: 'product-789', quantity: 2, price: 100 }],
        totalItems: 2,
        totalPrice: 200,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    ]);
  });
});
