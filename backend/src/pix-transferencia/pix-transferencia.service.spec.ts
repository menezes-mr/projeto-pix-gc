import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TransacaoPix } from '@prisma/client';
import { StatusTransacao } from '../common/enums/status.enum';
import { TipoOperacao } from '../common/enums/tipo-operacao.enum';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { HistoricoPixService } from '../shared/historico-pix/historico-pix.service';
import { PixTransferenciaModule } from './pix-transferencia.module';
import { PixTransferenciaService } from './pix-transferencia.service';

function criarPrismaMock() {
  const tx = {
    conta: {
      findUnique: jest.fn().mockResolvedValue({
        status: 'ATIVA',
        limiteDiarioPix: new Prisma.Decimal(1000),
        usuarios: [{ papel: 'TITULAR', usuario: { status: 'ATIVO' } }],
      }),
      update: jest.fn().mockResolvedValue({ saldo: new Prisma.Decimal(900) }),
    },
    chavePix: {
      findUnique: jest.fn().mockResolvedValue({
        contaId: 'conta-destino',
        status: 'ATIVA',
        conta: { status: 'ATIVA' },
      }),
    },
    transacaoPix: {
      create: jest.fn<Promise<TransacaoPix>, [Prisma.TransacaoPixCreateArgs]>(),
    },
    logAtividade: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (client: typeof tx) => Promise<TransacaoPix>) => callback(tx),
    ),
  };

  return { tx, prisma };
}

describe('PixTransferenciaService com HistoricoPixService', () => {
  const contexto = { contaOrigemId: 'conta-origem', usuarioId: 'usuario-id' };
  const dto = { chavePixDestino: 'destino@example.com', valor: 100 };
  const dadosHistorico = {
    chavePixUtilizada: dto.chavePixDestino,
    valor: new Prisma.Decimal(dto.valor),
    tipoOperacao: TipoOperacao.TRANSFERENCIA_SAIDA,
    status: StatusTransacao.EFETIVADA,
    contaOrigemId: contexto.contaOrigemId,
    contaDestinoId: 'conta-destino',
    usuarioSolicitanteId: contexto.usuarioId,
  };
  const transacao: TransacaoPix = {
    ...dadosHistorico,
    transacaoId: 'transacao-id',
    latitude: null,
    longitude: null,
    dataAgendamento: null,
    dataEfetivacao: new Date('2026-09-22T12:00:00.000Z'),
    transacaoExternaId: null,
    transacaoEstornoId: null,
  };

  let modulo: TestingModule;
  let service: PixTransferenciaService;
  let tx: ReturnType<typeof criarPrismaMock>['tx'];
  let prisma: ReturnType<typeof criarPrismaMock>['prisma'];
  let registrarTransacao: jest.SpyInstance;
  let emitirEvento: jest.SpyInstance;

  beforeEach(async () => {
    ({ tx, prisma } = criarPrismaMock());
    tx.transacaoPix.create.mockResolvedValue(transacao);

    modulo = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        PrismaModule,
        PixTransferenciaModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = modulo.get(PixTransferenciaService);
    registrarTransacao = jest.spyOn(
      modulo.get(HistoricoPixService),
      'registrarTransacao',
    );
    emitirEvento = jest
      .spyOn(modulo.get(EventEmitter2), 'emit')
      .mockReturnValue(false);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await modulo?.close();
  });

  it('registra a transferência imediata pelo histórico usando o mesmo tx', async () => {
    const resultado = await service.transferir(contexto, dto);

    expect(registrarTransacao).toHaveBeenCalledTimes(1);
    expect(registrarTransacao).toHaveBeenCalledWith(dadosHistorico, tx);
    expect(tx.transacaoPix.create).toHaveBeenCalledTimes(1);
    const dadosGravados = tx.transacaoPix.create.mock.calls[0][0].data;
    expect(dadosGravados).toMatchObject(dadosHistorico);
    expect(dadosGravados.dataEfetivacao).toBeInstanceOf(Date);
    expect(dadosGravados.dataAgendamento).toBeUndefined();
    expect(tx.conta.update).toHaveBeenCalledTimes(2);
    expect(tx.conta.update).toHaveBeenNthCalledWith(1, {
      where: { contaId: contexto.contaOrigemId },
      data: { saldo: { decrement: dadosHistorico.valor } },
    });
    expect(tx.conta.update).toHaveBeenNthCalledWith(2, {
      where: { contaId: dadosHistorico.contaDestinoId },
      data: { saldo: { increment: dadosHistorico.valor } },
    });
    expect(tx.logAtividade.create).toHaveBeenCalledWith({
      data: { acao: 'TRANSFERENCIA PIX', usuarioId: contexto.usuarioId },
    });
    expect(resultado).toBe(transacao);
    expect(emitirEvento).toHaveBeenCalledTimes(1);
    expect(emitirEvento).toHaveBeenCalledWith('pix.efetivado', transacao);
  });

  it('registra o agendamento como pendente sem movimentar saldo nem emitir evento', async () => {
    const dataAgendamento = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dadosAgendamento = {
      ...dadosHistorico,
      status: StatusTransacao.PENDENTE,
      dataAgendamento,
    };
    const transacaoAgendada = {
      ...transacao,
      ...dadosAgendamento,
      dataEfetivacao: null,
    };
    tx.transacaoPix.create.mockResolvedValue(transacaoAgendada);

    const resultado = await service.transferir(contexto, {
      ...dto,
      dataAgendamento: dataAgendamento.toISOString(),
    });

    expect(registrarTransacao).toHaveBeenCalledTimes(1);
    expect(registrarTransacao).toHaveBeenCalledWith(dadosAgendamento, tx);
    expect(tx.transacaoPix.create).toHaveBeenCalledTimes(1);
    expect(tx.transacaoPix.create).toHaveBeenCalledWith({
      data: { ...dadosAgendamento, dataEfetivacao: null },
    });
    expect(tx.conta.update).not.toHaveBeenCalled();
    expect(tx.logAtividade.create).toHaveBeenCalledTimes(1);
    expect(emitirEvento).not.toHaveBeenCalled();
    expect(resultado).toBe(transacaoAgendada);
  });

  it('propaga a falha no histórico sem gravar log nem emitir evento', async () => {
    const erro = new Error('Falha ao registrar histórico');
    tx.transacaoPix.create.mockRejectedValueOnce(erro);

    await expect(service.transferir(contexto, dto)).rejects.toBe(erro);

    expect(registrarTransacao).toHaveBeenCalledWith(dadosHistorico, tx);
    expect(tx.logAtividade.create).not.toHaveBeenCalled();
    expect(emitirEvento).not.toHaveBeenCalled();
  });

  it('aguarda a confirmação da transação antes de emitir o evento', async () => {
    const erro = new Error('Falha ao confirmar transação');
    prisma.$transaction.mockImplementationOnce(async (callback) => {
      await callback(tx);
      throw erro;
    });

    await expect(service.transferir(contexto, dto)).rejects.toBe(erro);

    expect(registrarTransacao).toHaveBeenCalledTimes(1);
    expect(tx.logAtividade.create).toHaveBeenCalledTimes(1);
    expect(emitirEvento).not.toHaveBeenCalled();
  });

  it('não registra histórico nem emite evento quando o saldo é insuficiente', async () => {
    tx.conta.update.mockResolvedValueOnce({ saldo: new Prisma.Decimal(-1) });

    await expect(service.transferir(contexto, dto)).rejects.toThrow(
      'Saldo insuficiente',
    );

    expect(tx.conta.update).toHaveBeenCalledTimes(1);
    expect(registrarTransacao).not.toHaveBeenCalled();
    expect(tx.transacaoPix.create).not.toHaveBeenCalled();
    expect(tx.logAtividade.create).not.toHaveBeenCalled();
    expect(emitirEvento).not.toHaveBeenCalled();
  });
});
