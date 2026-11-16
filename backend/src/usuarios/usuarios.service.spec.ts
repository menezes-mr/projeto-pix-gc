import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      findMany: jest.Mock;
      count: jest.Mock;
    };
    transacaoPix: {
      aggregate: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
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
        findMany: jest.fn(),
        count: jest.fn(),
      },
      transacaoPix: {
        aggregate: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
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

  it('deve listar logs do usuario ordenados do mais recente e paginados', async () => {
    const logs = [{ logId: 'l1' }, { logId: 'l2' }];
    prisma.logAtividade.findMany.mockResolvedValue(logs);
    prisma.logAtividade.count.mockResolvedValue(25);

    const resultado = await service.listarLogs('u-1', 2, 10);

    expect(prisma.logAtividade.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u-1' },
      orderBy: { dataHora: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(resultado.dados).toBe(logs);
    expect(resultado.meta).toEqual({
      total: 25,
      pagina: 2,
      limite: 10,
      totalPaginas: 3,
    });
  });

  it('deve limitar a pagina a 100 itens e corrigir pagina invalida', async () => {
    prisma.logAtividade.findMany.mockResolvedValue([]);
    prisma.logAtividade.count.mockResolvedValue(0);

    await service.listarLogs('u-1', 0, 500);

    expect(prisma.logAtividade.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u-1' },
      orderBy: { dataHora: 'desc' },
      skip: 0,
      take: 100,
    });
  });

  it('deve gerar relatorio consolidado do usuario no periodo selecionado', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      usuarioId: 'u-1',
      status: 'ATIVO',
      contas: [{ contaId: 'conta-1' }],
    });
    prisma.transacaoPix.aggregate
      .mockResolvedValueOnce({ _sum: { valor: new Prisma.Decimal(150) } })
      .mockResolvedValueOnce({ _sum: { valor: new Prisma.Decimal(400) } });
    prisma.transacaoPix.count.mockResolvedValue(3);
    prisma.transacaoPix.findMany.mockResolvedValue([
      {
        transacaoId: 'tx-1',
        valor: new Prisma.Decimal(400),
        tipoOperacao: 'TRANSFERENCIA',
        status: 'EFETIVADA',
        chavePixUtilizada: 'maria@email.com',
        dataEfetivacao: new Date('2026-11-10T10:00:00Z'),
        dataAgendamento: null,
        contaOrigemId: 'conta-2',
        contaDestinoId: 'conta-1',
        contaOrigem: {
          contaId: 'conta-2',
          agencia: '0001',
          numeroConta: '222222-2',
        },
        contaDestino: {
          contaId: 'conta-1',
          agencia: '0001',
          numeroConta: '111111-1',
        },
        usuarioSolicitante: { usuarioId: 'u-2', nomeCompleto: 'João' },
      },
    ]);

    const relatorio = await service.gerarRelatorioTransacoes(
      'u-1',
      'u-1',
      '2026-11-01',
      '2026-11-30',
    );

    expect(relatorio.resumo).toEqual({
      totalEnviado: 150,
      totalRecebido: 400,
      totalEntradas: 400,
      totalSaidas: 150,
      balancoPeriodo: 250,
      quantidadeTransacoes: 3,
    });
    expect(relatorio.transacoes).toHaveLength(1);
    expect(relatorio.transacoes[0].direcao).toBe('ENTRADA');
  });

  it('deve rejeitar relatorio de outro usuario com ForbiddenException', async () => {
    await expect(
      service.gerarRelatorioTransacoes(
        'u-2',
        'u-1',
        '2026-11-01',
        '2026-11-30',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
