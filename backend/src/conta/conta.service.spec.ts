import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContaService } from './conta.service';

describe('ContaService extrato', () => {
  it('filtra por efetivação ou agendamento e inclui dados do comprovante', async () => {
    const prisma = {
      conta: {
        findUnique: jest.fn().mockResolvedValue({ status: 'ATIVA' }),
      },
      usuarioConta: {
        findFirst: jest.fn().mockResolvedValue({ usuarioId: 'usuario-1' }),
      },
      transacaoPix: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest
        .fn()
        .mockImplementation((operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
    };
    const service = new ContaService(prisma as unknown as PrismaService);

    await service.listarTransacoes(
      'conta-1',
      'usuario-1',
      1,
      10,
      '2026-11-01',
      '2026-11-30',
    );

    const filtroEsperado = {
      gte: new Date('2026-11-01'),
      lte: new Date('2026-11-30T23:59:59.999Z'),
    };
    expect(prisma.transacaoPix.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { contaOrigemId: 'conta-1' },
            { contaDestinoId: 'conta-1', status: 'EFETIVADA' },
          ],
          AND: [
            {
              OR: [
                { dataEfetivacao: filtroEsperado },
                { dataAgendamento: filtroEsperado },
              ],
            },
          ],
        },
        include: {
          contaOrigem: {
            select: {
              contaId: true,
              agencia: true,
              numeroConta: true,
              usuarios: {
                where: { papel: 'TITULAR' },
                take: 1,
                select: {
                  usuario: { select: { nomeCompleto: true } },
                },
              },
            },
          },
          contaDestino: {
            select: {
              contaId: true,
              agencia: true,
              numeroConta: true,
              usuarios: {
                where: { papel: 'TITULAR' },
                take: 1,
                select: {
                  usuario: { select: { nomeCompleto: true } },
                },
              },
            },
          },
          usuarioSolicitante: {
            select: { usuarioId: true, nomeCompleto: true },
          },
        },
      }),
    );
  });
});

describe('ContaService cotitularidade', () => {
  const criarMockPrisma = () => ({
    conta: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ contaId: 'conta-1', status: 'ATIVA' }),
    },
    usuario: {
      findFirst: jest.fn(),
    },
    usuarioConta: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    conviteCotitular: { create: jest.fn() },
    logAtividade: {
      create: jest.fn().mockResolvedValue({}),
    },
  });

  it('deve listar cotitulares da conta com dados do usuário', async () => {
    const prisma = criarMockPrisma();
    const membros = [
      {
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
        usuario: {
          usuarioId: 'u-1',
          nomeCompleto: 'Maria Silva',
          email: 'maria@email.com',
          cpfCnpj: '11122233344',
          status: 'ATIVO',
        },
      },
    ];
    prisma.usuarioConta.findMany.mockResolvedValue(membros);
    const service = new ContaService(prisma as unknown as PrismaService);

    const resultado = await service.listarCotitulares('conta-1');

    expect(resultado).toEqual(membros);
    expect(prisma.usuarioConta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contaId: 'conta-1' },
      }),
    );
  });

  it('deve adicionar cotitular quando solicitante é TITULAR e usuário existe', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst
      .mockResolvedValueOnce({
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
      })
      .mockResolvedValueOnce(null);
    prisma.usuario.findFirst.mockResolvedValue({
      usuarioId: 'u-2',
      nomeCompleto: 'João Operador',
      email: 'joao@email.com',
      cpfCnpj: '55566677788',
      status: 'ATIVO',
    });
    prisma.conviteCotitular.create.mockResolvedValue({
      usuarioId: 'u-2',
      contaId: 'conta-1',
      papel: 'OPERADOR',
      usuario: {
        usuarioId: 'u-2',
        nomeCompleto: 'João Operador',
        email: 'joao@email.com',
        cpfCnpj: '55566677788',
        status: 'ATIVO',
      },
    });
    const service = new ContaService(prisma as unknown as PrismaService);

    const resultado = await service.adicionarCotitular('conta-1', 'u-1', {
      identificador: 'joao@email.com',
      papel: 'OPERADOR',
    });

    expect(resultado.papel).toBe('OPERADOR');
    expect(resultado.usuarioId).toBe('u-2');
    expect(prisma.conviteCotitular.create).toHaveBeenCalled();
    expect(prisma.usuarioConta.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar adição de cotitular se solicitante não for TITULAR', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst.mockResolvedValueOnce(null);
    const service = new ContaService(prisma as unknown as PrismaService);

    await expect(
      service.adicionarCotitular('conta-1', 'u-operador', {
        identificador: 'joao@email.com',
        papel: 'DEPENDENTE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve rejeitar adição de cotitular duplicado', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst
      .mockResolvedValueOnce({
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
      })
      .mockResolvedValueOnce({
        usuarioId: 'u-2',
        contaId: 'conta-1',
        papel: 'OPERADOR',
      });
    prisma.usuario.findFirst.mockResolvedValue({
      usuarioId: 'u-2',
      nomeCompleto: 'João Operador',
      status: 'ATIVO',
    });
    const service = new ContaService(prisma as unknown as PrismaService);

    await expect(
      service.adicionarCotitular('conta-1', 'u-1', {
        identificador: 'joao@email.com',
        papel: 'OPERADOR',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('deve lançar NotFoundException ao adicionar cotitular inexistente', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst.mockResolvedValueOnce({
      usuarioId: 'u-1',
      contaId: 'conta-1',
      papel: 'TITULAR',
    });
    prisma.usuario.findFirst.mockResolvedValue(null);
    const service = new ContaService(prisma as unknown as PrismaService);

    await expect(
      service.adicionarCotitular('conta-1', 'u-1', {
        identificador: 'naoexiste@email.com',
        papel: 'OPERADOR',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve impedir a remoção do único titular ativo da conta', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst
      .mockResolvedValueOnce({
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
      })
      .mockResolvedValueOnce({
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
        usuario: { usuarioId: 'u-1', nomeCompleto: 'Maria', status: 'ATIVO' },
      });
    prisma.usuarioConta.count.mockResolvedValue(1);
    const service = new ContaService(prisma as unknown as PrismaService);

    await expect(
      service.removerCotitular('conta-1', 'u-1', 'u-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.usuarioConta.delete).not.toHaveBeenCalled();
  });

  it('deve remover cotitular quando não é o único titular ativo', async () => {
    const prisma = criarMockPrisma();
    prisma.usuarioConta.findFirst
      .mockResolvedValueOnce({
        usuarioId: 'u-1',
        contaId: 'conta-1',
        papel: 'TITULAR',
      })
      .mockResolvedValueOnce({
        usuarioId: 'u-2',
        contaId: 'conta-1',
        papel: 'OPERADOR',
        usuario: { usuarioId: 'u-2', nomeCompleto: 'João', status: 'ATIVO' },
      });
    prisma.usuarioConta.delete.mockResolvedValue({});
    const service = new ContaService(prisma as unknown as PrismaService);

    const resposta = await service.removerCotitular('conta-1', 'u-1', 'u-2');

    expect(resposta.mensagem).toContain('sucesso');
    expect(prisma.usuarioConta.delete).toHaveBeenCalledWith({
      where: {
        usuarioId_contaId: {
          usuarioId: 'u-2',
          contaId: 'conta-1',
        },
      },
    });
  });
});
