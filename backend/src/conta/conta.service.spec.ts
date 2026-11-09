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
          OR: [{ contaOrigemId: 'conta-1' }, { contaDestinoId: 'conta-1' }],
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
            select: { contaId: true, agencia: true, numeroConta: true },
          },
          contaDestino: {
            select: { contaId: true, agencia: true, numeroConta: true },
          },
          usuarioSolicitante: {
            select: { usuarioId: true, nomeCompleto: true },
          },
        },
      }),
    );
  });
});
