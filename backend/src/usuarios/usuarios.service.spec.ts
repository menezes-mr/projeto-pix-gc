import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: {
    usuario: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    conta: {
      create: jest.Mock;
    };
    usuarioConta: {
      create: jest.Mock;
    };
    logAtividade: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      usuario: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      conta: {
        create: jest.fn(),
      },
      usuarioConta: {
        create: jest.fn(),
      },
      logAtividade: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  const baseDto = {
    nomeCompleto: 'Fulano de Tal',
    email: 'fulano@email.com',
    cpfCnpj: '12345678900',
    telefone: '11999999999',
  };

  it('deve rejeitar senha com menos de 8 caracteres', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        ...baseDto,
        senha: 'Ab1!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar senha sem numero', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        ...baseDto,
        senha: 'Abcdefgh!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar senha sem letra maiuscula', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        ...baseDto,
        senha: 'abcdefg1!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar senha sem caractere especial', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        ...baseDto,
        senha: 'Abcdefg12',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve criar usuario quando a senha cumprir todos os requisitos', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    const usuarioMock = {
      usuarioId: 'u-1',
      nomeCompleto: baseDto.nomeCompleto,
      email: baseDto.email,
      cpfCnpj: baseDto.cpfCnpj,
      senha: 'hashed_password',
      status: 'ATIVO',
    };
    prisma.usuario.create.mockResolvedValue(usuarioMock);
    prisma.conta.create.mockResolvedValue({
      contaId: 'c-1',
      numeroConta: '123456-7',
    });
    prisma.usuarioConta.create.mockResolvedValue({});
    prisma.logAtividade.create.mockResolvedValue({});

    const resultado = await service.create({
      ...baseDto,
      senha: 'SenhaForte123!',
    });

    expect(resultado).toBeDefined();
    expect(resultado.usuarioId).toBe('u-1');
  });
});
