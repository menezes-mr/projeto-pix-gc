import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { PrismaService } from '../prisma/prisma.service';
import { TipoChavePix } from './dto/create-chave-pix.dto';

describe('PixKeyService', () => {
  let service: PixKeyService;
  let prisma: {
    conta: { findUnique: jest.Mock };
    chavePix: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    logAtividade: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      conta: { findUnique: jest.fn() },
      chavePix: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      logAtividade: { create: jest.fn() },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PixKeyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PixKeyService>(PixKeyService);
  });

  const mockContaValida = {
    contaId: 'c1',
    status: 'ATIVA',
    usuarios: [
      {
        papel: 'TITULAR',
        usuario: {
          usuarioId: 'u1',
          status: 'ATIVO',
          cpfCnpj: '12345678900',
          email: 'teste@email.com',
          nomeCompleto: 'Usuario Teste',
        },
      },
    ],
  };

  it('deve listar apenas chaves ativas da conta', async () => {
    const chavesMock = [{ chaveId: 'k1', status: 'ATIVA' }];
    prisma.chavePix.findMany.mockResolvedValue(chavesMock);

    const resultado = await service.listarChavesDaConta('c1');

    expect(prisma.chavePix.findMany).toHaveBeenCalledWith({
      where: { contaId: 'c1', status: 'ATIVA' },
      orderBy: { dataCriacao: 'desc' },
    });
    expect(resultado).toBe(chavesMock);
  });

  it('deve barrar geracao de chave aleatoria se limite de 5 chaves for atingido', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.count.mockResolvedValue(5);

    await expect(service.generateRandomKey('c1', 'u1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve gerar chave aleatoria com sucesso quando houver menos de 5 chaves', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.count.mockResolvedValue(4);
    const chaveCriada = {
      chaveId: 'k2',
      valorChave: 'uuid-mock',
      status: 'ATIVA',
    };
    prisma.chavePix.create.mockReturnValue(chaveCriada);
    prisma.logAtividade.create.mockReturnValue({});

    const resultado = await service.generateRandomKey('c1', 'u1');

    expect(resultado).toEqual(chaveCriada);
  });

  it('deve barrar associacao de chave se limite de 5 chaves for atingido', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.count.mockResolvedValue(5);

    await expect(
      service.associarChavePix({
        tipoChave: TipoChavePix.CPF,
        valorChave: '12345678900',
        contaId: 'c1',
        usuarioId: 'u1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve inativar chave pix com sucesso', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.findUnique.mockResolvedValue({
      chaveId: 'k1',
      tipoChave: 'CPF',
      valorChave: '12345678900',
      contaId: 'c1',
      status: 'ATIVA',
    });
    const chaveInativada = {
      chaveId: 'k1',
      status: 'INATIVA',
    };
    prisma.chavePix.update.mockReturnValue(chaveInativada);
    prisma.logAtividade.create.mockReturnValue({});

    const resultado = await service.inativarChavePix('k1', 'c1', 'u1');

    expect(resultado.mensagem).toBe('Chave PIX inativada com sucesso.');
    expect(resultado.chave).toEqual(chaveInativada);
  });

  it('deve lançar NotFoundException ao tentar inativar chave inexistente ou de outra conta', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.findUnique.mockResolvedValue(null);

    await expect(service.inativarChavePix('k99', 'c1', 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve reativar chave existente se status anterior era INATIVA para a mesma conta', async () => {
    prisma.conta.findUnique.mockResolvedValue(mockContaValida);
    prisma.chavePix.count.mockResolvedValue(2);
    prisma.chavePix.findUnique.mockResolvedValue({
      chaveId: 'k1',
      tipoChave: 'CPF',
      valorChave: '12345678900',
      contaId: 'c1',
      status: 'INATIVA',
    });
    const chaveReativada = {
      chaveId: 'k1',
      status: 'ATIVA',
    };
    prisma.chavePix.update.mockReturnValue(chaveReativada);
    prisma.logAtividade.create.mockReturnValue({});

    const resultado = await service.associarChavePix({
      tipoChave: TipoChavePix.CPF,
      valorChave: '12345678900',
      contaId: 'c1',
      usuarioId: 'u1',
    });

    expect(resultado).toEqual(chaveReativada);
  });
});
