import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './dto/product.dto';

describe('ProductsService', () => {
  let productsService: ProductsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('Deve retornar todos os produtos', async () => {
    const mockProducts: ProductDto[] = [
      {
        id: 'prod-1',
        name: 'Produto 1',
        description: 'Descrição do produto 1',
        price: 100,
        images: ['image1.jpg'],
        rating: 4.5,
        colors: [
          {
            id: 'color-1',
            name: 'Azul Claro',
            hex: '#ADD8E6',
            images: ['image1.jpg'],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ];

    (prismaService.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const result = await productsService.findAll();

    expect(result).toEqual(mockProducts);
    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      include: { colors: true },
    });
  });

  it('Deve retornar um produto pelo ID', async () => {
    const mockProduct: ProductDto = {
      id: 'prod-1',
      name: 'Produto 1',
      description: 'Descrição do produto 1',
      price: 100,
      images: ['image1.jpg'],
      rating: 4.5,
      colors: [
        {
          id: 'color-1',
          name: 'Azul Claro',
          hex: '#ADD8E6',
          images: ['image1.jpg'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    (prismaService.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

    const result = await productsService.findOne('prod-1');

    expect(result).toEqual(mockProduct);
    expect(prismaService.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      include: { colors: true },
    });
  });

  it('Deve lançar um erro ao buscar um produto inexistente', async () => {
    (prismaService.product.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(productsService.findOne('prod-999')).rejects.toThrowError('Produto não encontrado');
  });

  it('Deve atualizar o rating de um produto', async () => {
    const updatedProduct: ProductDto = {
      id: 'prod-1',
      name: 'Produto 1',
      description: 'Descrição do produto 1',
      price: 100,
      images: ['image1.jpg'],
      rating: 4.8,
      colors: [
        {
          id: 'color-1',
          name: 'Azul Claro',
          hex: '#ADD8E6',
          images: ['image1.jpg'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    (prismaService.product.update as jest.Mock).mockResolvedValue(updatedProduct);

    const result = await productsService.updateRating('prod-1', 4.8);

    expect(result).toEqual(updatedProduct);
    expect(prismaService.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { rating: 4.8 },
      include: { colors: true },
    });
  });

  it('Deve retornar o rating de um produto', async () => {
    (prismaService.product.findUnique as jest.Mock).mockResolvedValue({ rating: 4.2 });

    const result = await productsService.getRating('prod-1');

    expect(result).toBe(4.2);
    expect(prismaService.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      select: { rating: true },
    });
  });

  it('Deve retornar null caso o produto não tenha rating', async () => {
    (prismaService.product.findUnique as jest.Mock).mockResolvedValue({ rating: null });

    const result = await productsService.getRating('prod-1');

    expect(result).toBeNull();
  });
});
