import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { HistoricoPixService } from '../shared/historico-pix/historico-pix.service';
import { PixTransferenciaService } from './pix-transferencia.service';

describe('Estorno PIX', () => {
  const contexto = { contaOrigemId: 'destino', usuarioId: 'usuario' };
  const dto = { transacaoIdOriginal: 'original' };
  const original = {
    transacaoId: 'original',
    contaOrigemId: 'origem',
    contaDestinoId: 'destino',
    valor: new Prisma.Decimal('10.25'),
    status: 'EFETIVADA',
    tipoOperacao: 'TRANSFERENCIA_SAIDA',
    transacaoEstornoId: null,
  };
  let tx: {
    transacaoPix: {
      findUnique: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    usuarioConta: { findFirst: jest.Mock };
    conta: { updateMany: jest.Mock; update: jest.Mock };
    logAtividade: { create: jest.Mock };
  };
  let service: PixTransferenciaService;
  beforeEach(() => {
    tx = {
      transacaoPix: {
        findUnique: jest.fn().mockResolvedValue({ ...original }),
        create: jest.fn().mockResolvedValue({ transacaoId: 'estorno' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      usuarioConta: { findFirst: jest.fn().mockResolvedValue({}) },
      conta: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      logAtividade: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    service = new PixTransferenciaService(
      prisma as unknown as PrismaService,
      {} as EventEmitter2,
      {} as HistoricoPixService,
    );
  });
  it('devolve o valor integral e registra o vínculo e log', async () => {
    await expect(service.estornar(contexto, dto)).resolves.toEqual({
      transacaoId: 'estorno',
    });
    expect(tx.conta.updateMany).toHaveBeenCalledWith({
      where: {
        contaId: 'destino',
        status: 'ATIVA',
        saldo: { gte: original.valor },
      },
      data: { saldo: { decrement: original.valor } },
    });
    expect(tx.conta.update).toHaveBeenCalledWith({
      where: { contaId: 'origem' },
      data: { saldo: { increment: original.valor } },
    });
    expect(tx.logAtividade.create).toHaveBeenCalledWith({
      data: { usuarioId: 'usuario', acao: 'ESTORNO_PIX' },
    });
  });
  it('rejeita transação inexistente', async () => {
    tx.transacaoPix.findUnique.mockResolvedValue(null);
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'não encontrada',
    );
  });
  it('rejeita conta diferente da recebedora', async () => {
    await expect(
      service.estornar({ ...contexto, contaOrigemId: 'outra' }, dto),
    ).rejects.toThrow('conta recebedora');
  });
  it('rejeita transação já estornada', async () => {
    tx.transacaoPix.findUnique.mockResolvedValue({
      ...original,
      transacaoEstornoId: 'anterior',
    });
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'já estornada',
    );
  });
  it('rejeita transação não efetivada', async () => {
    tx.transacaoPix.findUnique.mockResolvedValue({
      ...original,
      status: 'PENDENTE',
    });
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'não está efetivada',
    );
  });
  it('rejeita saldo insuficiente', async () => {
    tx.conta.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'Saldo insuficiente',
    );
    expect(tx.conta.update).not.toHaveBeenCalled();
  });
  it('rejeita estorno de estorno', async () => {
    tx.transacaoPix.findUnique.mockResolvedValue({
      ...original,
      tipoOperacao: 'ESTORNO',
    });
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'não elegível',
    );
  });
  it('rejeita a operação que perde a disputa pela atualização condicional', async () => {
    tx.transacaoPix.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.estornar(contexto, dto)).rejects.toThrow(
      'já estornada',
    );
    expect(tx.conta.updateMany).not.toHaveBeenCalled();
  });
  it('propaga falha na gravação do log para o rollback da transação', async () => {
    tx.logAtividade.create.mockRejectedValue(new Error('falha'));
    await expect(service.estornar(contexto, dto)).rejects.toThrow('falha');
  });
});
