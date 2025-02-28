import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(), 
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService }, 
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('Deve validar um usuário com credenciais corretas', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10), 
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.validateUser({ email: 'test@example.com', password: 'password123' });

    expect(result).toEqual(mockUser);
  });

  it('Deve lançar UnauthorizedException se o usuário não for encontrado', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(authService.validateUser({ email: 'notfound@example.com', password: 'password123' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('Deve lançar UnauthorizedException se a senha for inválida', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
    };

    (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    await expect(authService.validateUser({ email: 'test@example.com', password: 'wrongpassword' }))
      .rejects.toThrow(UnauthorizedException);
  });
});
