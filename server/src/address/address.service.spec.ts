import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddressDto } from './dto/address.dto';

describe('AddressService', () => {
  let addressService: AddressService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        {
          provide: PrismaService,
          useValue: {
            address: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    addressService = module.get<AddressService>(AddressService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('Deve criar um novo endereço', async () => {
    const createAddressDto: CreateAddressDto = {
      fullName: 'Marcos Paulo',
      addressLine1: 'Rua Exemplo, 123',
      addressLine2: 'Apto 45',
      city: 'Cidade',
      state: 'MG',
      zipCode: '01010-000',
      country: 'Brasil',
      userId: 'user-123',
    };

    const mockAddress: AddressDto = {
      id: 'address-123',
      ...createAddressDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaService.address.create as jest.Mock).mockResolvedValue(mockAddress);

    const result = await addressService.create(createAddressDto);

    expect(result).toEqual(mockAddress);
    expect(prismaService.address.create).toHaveBeenCalledWith({
      data: createAddressDto,
    });
  });

  it('Deve retornar todos os endereços de um usuário', async () => {
    const userId = 'user-123';

    const mockAddresses: AddressDto[] = [
      {
        id: 'address-123',
        fullName: 'Marcos Paulo',
        addressLine1: 'Rua Exemplo, 123',
        addressLine2: 'Apto 45',
        city: 'Cidade',
        state: 'MG',
        zipCode: '01010-000',
        country: 'Brasil',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (prismaService.address.findMany as jest.Mock).mockResolvedValue(mockAddresses);

    const result = await addressService.findAllByUser(userId);

    expect(result).toEqual(mockAddresses);
    expect(prismaService.address.findMany).toHaveBeenCalledWith({ where: { userId } });
  });

  it('Deve retornar um endereço pelo ID', async () => {
    const addressId = 'address-123';

    const mockAddress: AddressDto = {
      id: addressId,
      fullName: 'Marcos Paulo',
      addressLine1: 'Rua Exemplo, 123',
      addressLine2: 'Apto 45',
      city: 'Cidade',
      state: 'MG',
      zipCode: '01010-000',
      country: 'Brasil',
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaService.address.findUnique as jest.Mock).mockResolvedValue(mockAddress);

    const result = await addressService.findOne(addressId);

    expect(result).toEqual(mockAddress);
    expect(prismaService.address.findUnique).toHaveBeenCalledWith({ where: { id: addressId } });
  });

  it('Deve lançar um erro se o endereço não for encontrado', async () => {
    const addressId = 'not-found';

    (prismaService.address.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(addressService.findOne(addressId)).rejects.toThrowError('Endereço não encontrado');
  });
});
