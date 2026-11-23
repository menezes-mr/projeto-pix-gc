import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('login administrativo', () => {
  it('rejeita as credenciais fixas quando não há administrador cadastrado', async () => {
    const prisma = {
      usuario: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
    );
    await expect(
      service.adminLogin({ identificador: 'admin', senha: 'admin123' }),
    ).rejects.toThrow('Credenciais de administrador inválidas');
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
