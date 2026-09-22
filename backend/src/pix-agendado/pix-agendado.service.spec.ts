import { Logger } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PixAgendadoModule } from './pix-agendado.module';
import { PixAgendadoService } from './pix-agendado.service';

describe('Rotina automática de PIX agendado', () => {
  let modulo: TestingModule;
  let service: PixAgendadoService;
  let buscarPendentes: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-09-22T12:00:00.000Z') });
    buscarPendentes = jest.fn().mockResolvedValue([]);
    modulo = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        PixAgendadoModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ transacaoPix: { findMany: buscarPendentes } })
      .compile();
    service = modulo.get(PixAgendadoService);
    await modulo.init();
  });

  afterEach(async () => {
    await modulo?.close();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('registra o Cron e busca apenas pendências vencidas a cada minuto', async () => {
    await jest.advanceTimersByTimeAsync(59_000);
    expect(buscarPendentes).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1_000);
    expect(buscarPendentes).toHaveBeenCalledTimes(1);
    expect(buscarPendentes).toHaveBeenCalledWith({
      where: {
        status: 'PENDENTE',
        dataAgendamento: { lte: new Date('2026-09-22T12:01:00.000Z') },
      },
      select: { transacaoId: true },
      orderBy: [{ dataAgendamento: 'asc' }, { transacaoId: 'asc' }],
    });
    await jest.advanceTimersByTimeAsync(60_000);
    expect(buscarPendentes).toHaveBeenCalledTimes(2);
  });

  it('continua processando as demais pendências quando uma execução falha', async () => {
    buscarPendentes.mockResolvedValue([
      { transacaoId: 'pix-1' },
      { transacaoId: 'pix-2' },
      { transacaoId: 'pix-3' },
    ]);
    const erro = new Error('Banco temporariamente indisponível');
    const registrarErro = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const executar = jest
      .spyOn(service, 'executar')
      .mockRejectedValueOnce(erro)
      .mockResolvedValue(null);

    await service.processarPendentes();

    expect(executar).toHaveBeenCalledTimes(3);
    expect(executar).toHaveBeenNthCalledWith(1, 'pix-1', new Date());
    expect(executar).toHaveBeenNthCalledWith(2, 'pix-2', new Date());
    expect(executar).toHaveBeenNthCalledWith(3, 'pix-3', new Date());
    expect(registrarErro).toHaveBeenCalledWith(
      'Erro ao executar PIX agendado pix-1',
      erro,
    );
  });

  it('não sobrepõe dois ciclos do Cron na mesma instância', async () => {
    buscarPendentes.mockResolvedValue([{ transacaoId: 'pix-lento' }]);
    let concluir!: () => void;
    let avisarInicio!: () => void;
    const iniciado = new Promise<void>((resolve) => {
      avisarInicio = resolve;
    });
    const processamento = new Promise<null>((resolve) => {
      concluir = () => resolve(null);
    });
    jest.spyOn(service, 'executar').mockImplementation(() => {
      avisarInicio();
      return processamento;
    });
    const cron = modulo
      .get(SchedulerRegistry)
      .getCronJob('executar-pix-agendados');

    const primeiroCiclo = cron.fireOnTick();
    await iniciado;
    try {
      await cron.fireOnTick();
      expect(buscarPendentes).toHaveBeenCalledTimes(1);
    } finally {
      concluir();
      await primeiroCiclo;
    }
  });
});
