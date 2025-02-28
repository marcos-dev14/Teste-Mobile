import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('Deve criar um novo usuário', async () => {
    const createUserDto: CreateUserDto = {
      name: 'Marcos Paulo',
      email: 'marcos@email.com',
      password: 'senha123',
    };

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const mockUser = {
      id: 'user-123',
      ...createUserDto,
      password: hashedPassword,
    };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await usersService.create(createUserDto);

    expect(result).toEqual(mockUser);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: expect.any(String), // Garante que a senha foi criptografada
      },
    });
  });

  it('Deve lançar um erro ao tentar criar um usuário com e-mail já cadastrado', async () => {
    const createUserDto: CreateUserDto = {
      name: 'Marcos Paulo',
      email: 'marcos@email.com',
      password: 'senha123',
    };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      ...createUserDto,
      password: 'hashedpassword',
    });

    await expect(usersService.create(createUserDto)).rejects.toThrowError('Usuário já cadastrado');
  });

  it('Deve encontrar um usuário pelo e-mail', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Marcos Paulo',
      email: 'marcos@email.com',
      password: 'hashedpassword',
    };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await usersService.findByEmail(mockUser.email);

    expect(result).toEqual(mockUser);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockUser.email },
    });
  });

  it('Deve encontrar um usuário pelo ID', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Marcos Paulo',
      email: 'marcos@email.com',
      password: 'hashedpassword',
      addresses: [],
    };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await usersService.findOne(mockUser.id);

    expect(result).toEqual(mockUser);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      include: { addresses: true },
    });
  });

  it('Deve retornar null se um usuário não for encontrado pelo e-mail', async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await usersService.findByEmail('naoexiste@email.com');

    expect(result).toBeNull();
  });
});
