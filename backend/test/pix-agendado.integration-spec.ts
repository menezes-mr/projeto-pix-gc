import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PixAgendadoService } from '../src/pix-agendado/pix-agendado.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.PIX_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Defina PIX_TEST_DATABASE_URL para um PostgreSQL de testes.');
}
const schema = `pix_agendado_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(databaseUrl);
url.searchParams.set('schema', schema);

describe('PIX agendado no PostgreSQL', () => {
  const prisma = new PrismaService({ datasources: { db: { url: url.href } } });
  const outroPrisma = new PrismaService({
    datasources: { db: { url: url.href } },
  });
  const eventos = new EventEmitter2();
  const service = new PixAgendadoService(prisma, eventos);
  const outroService = new PixAgendadoService(outroPrisma, eventos);
  let emitir: jest.SpyInstance;

  beforeAll(async () => {
    execFileSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      {
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: url.href, DIRECT_URL: url.href },
        stdio: 'pipe',
      },
    );
    await Promise.all([prisma.$connect(), outroPrisma.$connect()]);
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.logAtividade.deleteMany(),
      prisma.transacaoPix.deleteMany(),
      prisma.usuarioConta.deleteMany(),
      prisma.conta.deleteMany(),
      prisma.usuario.deleteMany(),
    ]);
    emitir = jest.spyOn(eventos, 'emit').mockReturnValue(false);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await outroPrisma.$disconnect();
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$disconnect();
  });

  async function preparar(saldo = 100, valor = 40) {
    const criarUsuario = () =>
      prisma.usuario.create({
        data: {
          cpfCnpj: randomUUID(),
          nomeCompleto: 'Usuário de teste',
          email: `${randomUUID()}@example.com`,
          senha: 'senha-exclusiva-de-teste',
        },
      });
    const solicitante = await criarUsuario();
    const destinatario = await criarUsuario();
    const origem = await prisma.conta.create({
      data: {
        agencia: '0001',
        numeroConta: randomUUID(),
        saldo,
        usuarios: {
          create: { usuarioId: solicitante.usuarioId, papel: 'TITULAR' },
        },
      },
    });
    const destino = await prisma.conta.create({
      data: {
        agencia: '0001',
        numeroConta: randomUUID(),
        usuarios: {
          create: { usuarioId: destinatario.usuarioId, papel: 'TITULAR' },
        },
      },
    });
    const dadosPix = {
      contaOrigemId: origem.contaId,
      contaDestinoId: destino.contaId,
      usuarioSolicitanteId: solicitante.usuarioId,
      valor,
      status: 'PENDENTE',
      tipoOperacao: 'TRANSFERENCIA_SAIDA',
      dataAgendamento: new Date(Date.now() - 60_000),
    };
    const pix = await prisma.transacaoPix.create({ data: dadosPix });
    return { origem, destino, solicitante, destinatario, pix, dadosPix };
  }

  async function saldos(origemId: string, destinoId: string) {
    const origem = await prisma.conta.findUniqueOrThrow({
      where: { contaId: origemId },
    });
    const destino = await prisma.conta.findUniqueOrThrow({
      where: { contaId: destinoId },
    });
    return [origem.saldo.toNumber(), destino.saldo.toNumber()];
  }

  it('efetiva o registro existente, movimenta saldos e registra o solicitante', async () => {
    const { origem, destino, solicitante, pix } = await preparar();
    const inicio = Date.now();

    const resultado = await service.executar(pix.transacaoId);

    expect(resultado?.status).toBe('EFETIVADA');
    expect(resultado?.dataEfetivacao?.getTime()).toBeGreaterThanOrEqual(inicio);
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([60, 40]);
    expect(await prisma.transacaoPix.count()).toBe(1);
    const logs = await prisma.logAtividade.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].acao).toBe('EXECUCAO_PIX_AGENDADO');
    expect(logs[0].usuarioId).toBe(solicitante.usuarioId);
    expect(emitir).toHaveBeenCalledWith('pix.efetivado', resultado);
  });

  it('permite consumir exatamente o saldo disponível', async () => {
    const { origem, destino, pix } = await preparar(40);
    await service.executar(pix.transacaoId);
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([0, 40]);
  });

  it('desfaz o decremento negativo e persiste FALHA sem crédito ou log', async () => {
    const { origem, destino, pix } = await preparar(10);
    const resultado = await service.executar(pix.transacaoId);
    expect(resultado?.status).toBe('FALHA');
    expect(resultado?.dataEfetivacao).toBeNull();
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([10, 0]);
    expect(await prisma.logAtividade.count()).toBe(0);
    expect(emitir).not.toHaveBeenCalled();
  });

  it.each(['origem', 'destino', 'solicitante', 'destinatario'] as const)(
    'falha sem movimentação quando %s está inativo',
    async (alvo) => {
      const dados = await preparar();
      if (alvo === 'origem' || alvo === 'destino') {
        await prisma.conta.update({
          where: { contaId: dados[alvo].contaId },
          data: { status: 'INATIVA' },
        });
      } else {
        await prisma.usuario.update({
          where: { usuarioId: dados[alvo].usuarioId },
          data: { status: 'INATIVO' },
        });
      }
      const resultado = await service.executar(dados.pix.transacaoId);
      expect(resultado?.status).toBe('FALHA');
      expect(await saldos(dados.origem.contaId, dados.destino.contaId)).toEqual(
        [100, 0],
      );
      expect(await prisma.logAtividade.count()).toBe(0);
      expect(emitir).not.toHaveBeenCalled();
    },
  );

  it('também verifica os demais usuários vinculados à conta', async () => {
    const dados = await preparar();
    await prisma.usuarioConta.create({
      data: {
        conta: { connect: { contaId: dados.origem.contaId } },
        papel: 'DEPENDENTE',
        usuario: {
          create: {
            cpfCnpj: randomUUID(),
            nomeCompleto: 'Dependente',
            email: `${randomUUID()}@example.com`,
            senha: 'teste',
            status: 'BLOQUEADO',
          },
        },
      },
    });
    expect((await service.executar(dados.pix.transacaoId))?.status).toBe(
      'FALHA',
    );
    expect(await saldos(dados.origem.contaId, dados.destino.contaId)).toEqual([
      100, 0,
    ]);
  });

  it('falha quando o usuário que agendou perdeu a titularidade', async () => {
    const { origem, solicitante, pix } = await preparar();
    await prisma.usuarioConta.update({
      where: {
        usuarioId_contaId: {
          usuarioId: solicitante.usuarioId,
          contaId: origem.contaId,
        },
      },
      data: { papel: 'DEPENDENTE' },
    });
    expect((await service.executar(pix.transacaoId))?.status).toBe('FALHA');
    expect(await prisma.logAtividade.count()).toBe(0);
  });

  it('falha para agendamento legado sem identificação do solicitante', async () => {
    const { pix } = await preparar();
    await prisma.transacaoPix.update({
      where: { transacaoId: pix.transacaoId },
      data: { usuarioSolicitanteId: null },
    });
    expect((await service.executar(pix.transacaoId))?.status).toBe('FALHA');
    expect(await prisma.logAtividade.count()).toBe(0);
  });

  it.each(['EFETIVADA', 'FALHA', 'CANCELADA'])(
    'ignora uma transação com status %s',
    async (status) => {
      const { origem, destino, pix } = await preparar();
      await prisma.transacaoPix.update({
        where: { transacaoId: pix.transacaoId },
        data: { status },
      });
      expect(await service.executar(pix.transacaoId)).toBeNull();
      expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
      expect(emitir).not.toHaveBeenCalled();
    },
  );

  it('ignora agendamentos futuros e sem data', async () => {
    const { origem, destino, pix } = await preparar();
    for (const dataAgendamento of [new Date(Date.now() + 60_000), null]) {
      await prisma.transacaoPix.update({
        where: { transacaoId: pix.transacaoId },
        data: { dataAgendamento },
      });
      expect(await service.executar(pix.transacaoId)).toBeNull();
    }
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
  });

  it('duas instâncias concorrentes e uma repetição debitam o mesmo PIX só uma vez', async () => {
    const { origem, destino, pix } = await preparar();
    await Promise.all([
      service.executar(pix.transacaoId),
      outroService.executar(pix.transacaoId),
    ]);
    expect(await service.executar(pix.transacaoId)).toBeNull();
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([60, 40]);
    expect(await prisma.logAtividade.count()).toBe(1);
    expect(emitir).toHaveBeenCalledTimes(1);
  });

  it('executa um agendamento exatamente no limite de data informado', async () => {
    const { pix } = await preparar();
    const agora = new Date('2026-09-22T12:00:00.000Z');
    await prisma.transacaoPix.update({
      where: { transacaoId: pix.transacaoId },
      data: { dataAgendamento: agora },
    });
    expect((await service.executar(pix.transacaoId, agora))?.status).toBe(
      'EFETIVADA',
    );
  });

  it('executa transferências simultâneas em sentidos opostos sem duplicar saldos', async () => {
    const { origem, destino, destinatario, pix, dadosPix } = await preparar();
    await prisma.conta.update({
      where: { contaId: destino.contaId },
      data: { saldo: 100 },
    });
    const reverso = await prisma.transacaoPix.create({
      data: {
        ...dadosPix,
        contaOrigemId: destino.contaId,
        contaDestinoId: origem.contaId,
        usuarioSolicitanteId: destinatario.usuarioId,
      },
    });
    const resultados = await Promise.all([
      service.executar(pix.transacaoId),
      outroService.executar(reverso.transacaoId),
    ]);
    expect(resultados.map((resultado) => resultado?.status)).toEqual([
      'EFETIVADA',
      'EFETIVADA',
    ]);
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 100]);
    expect(await prisma.logAtividade.count()).toBe(2);
  });

  it('duas transferências concorrentes não gastam o mesmo saldo', async () => {
    const { origem, destino, pix, dadosPix } = await preparar(100, 80);
    const outroPix = await prisma.transacaoPix.create({ data: dadosPix });
    const resultados = await Promise.all([
      service.executar(pix.transacaoId),
      outroService.executar(outroPix.transacaoId),
    ]);
    expect(resultados.map((resultado) => resultado?.status).sort()).toEqual([
      'EFETIVADA',
      'FALHA',
    ]);
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([20, 80]);
    expect(await prisma.logAtividade.count()).toBe(1);
    expect(emitir).toHaveBeenCalledTimes(1);
  });

  it('falha técnica no log desfaz saldos e status e permite tentar novamente', async () => {
    const { origem, destino, pix } = await preparar();
    await prisma.$executeRaw`
      CREATE FUNCTION falhar_log_pix() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Falha técnica simulada'; END; $$
    `;
    await prisma.$executeRaw`
      CREATE TRIGGER falhar_log_pix BEFORE INSERT ON "LogAtividade"
      FOR EACH ROW EXECUTE FUNCTION falhar_log_pix()
    `;
    try {
      await expect(service.executar(pix.transacaoId)).rejects.toThrow();
      expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
      const salvo = await prisma.transacaoPix.findUniqueOrThrow({
        where: { transacaoId: pix.transacaoId },
      });
      expect(salvo.status).toBe('PENDENTE');
      expect(salvo.dataEfetivacao).toBeNull();
      expect(emitir).not.toHaveBeenCalled();
    } finally {
      await prisma.$executeRaw`DROP FUNCTION falhar_log_pix() CASCADE`;
    }
    expect((await service.executar(pix.transacaoId))?.status).toBe('EFETIVADA');
  });

  it('processa o lote vencido, mantém futuros pendentes e segue após falha de saldo', async () => {
    const { origem, destino, pix, dadosPix } = await preparar(30, 40);
    const valido = await prisma.transacaoPix.create({
      data: { ...dadosPix, valor: 10 },
    });
    const futuro = await prisma.transacaoPix.create({
      data: { ...dadosPix, dataAgendamento: new Date(Date.now() + 86_400_000) },
    });
    const cancelado = await prisma.transacaoPix.create({
      data: { ...dadosPix, status: 'CANCELADA' },
    });

    await service.processarPendentes();

    for (const [transacaoId, status] of [
      [pix.transacaoId, 'FALHA'],
      [valido.transacaoId, 'EFETIVADA'],
      [futuro.transacaoId, 'PENDENTE'],
      [cancelado.transacaoId, 'CANCELADA'],
    ]) {
      const salvo = await prisma.transacaoPix.findUniqueOrThrow({
        where: { transacaoId },
      });
      expect(salvo.status).toBe(status);
    }
    expect(await saldos(origem.contaId, destino.contaId)).toEqual([20, 10]);
    expect(await prisma.logAtividade.count()).toBe(1);
  });

  describe('Cancelamento', () => {
    it.each(['futuro', 'vencido'])(
      'cancela PIX pendente %s, preserva saldos e registra a auditoria',
      async (prazo) => {
        const { origem, destino, solicitante, pix } = await preparar();
        if (prazo === 'futuro') {
          await prisma.transacaoPix.update({
            where: { transacaoId: pix.transacaoId },
            data: { dataAgendamento: new Date(Date.now() + 86_400_000) },
          });
        }

        const cancelada = await service.cancelar(
          pix.transacaoId,
          solicitante.usuarioId,
        );

        expect(cancelada.status).toBe('CANCELADA');
        expect(cancelada.transacaoId).toBe(pix.transacaoId);
        expect(cancelada.dataEfetivacao).toBeNull();
        expect(await prisma.transacaoPix.count()).toBe(1);
        expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
        const logs = await prisma.logAtividade.findMany();
        expect(logs).toHaveLength(1);
        expect(logs[0].acao).toBe('CANCELAMENTO_PIX_AGENDADO');
        expect(logs[0].usuarioId).toBe(solicitante.usuarioId);
        expect(await outroService.executar(pix.transacaoId)).toBeNull();
        expect(emitir).not.toHaveBeenCalled();
      },
    );

    it('recusa usuário titular apenas da conta de destino', async () => {
      const { origem, destino, destinatario, pix } = await preparar();
      await expect(
        service.cancelar(pix.transacaoId, destinatario.usuarioId),
      ).rejects.toMatchObject({ status: 403 });
      expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
      expect(await prisma.logAtividade.count()).toBe(0);
      expect(
        (
          await prisma.transacaoPix.findUniqueOrThrow({
            where: { transacaoId: pix.transacaoId },
          })
        ).status,
      ).toBe('PENDENTE');
    });

    it('recusa dependente da origem, mesmo sendo o solicitante original', async () => {
      const { origem, solicitante, pix } = await preparar();
      await prisma.usuarioConta.update({
        where: {
          usuarioId_contaId: {
            contaId: origem.contaId,
            usuarioId: solicitante.usuarioId,
          },
        },
        data: { papel: 'DEPENDENTE' },
      });
      await expect(
        service.cancelar(pix.transacaoId, solicitante.usuarioId),
      ).rejects.toMatchObject({ status: 403 });
      expect(await prisma.logAtividade.count()).toBe(0);
    });

    it('permite outro titular ativo da origem e registra quem cancelou', async () => {
      const { origem, destinatario, solicitante, pix } = await preparar();
      await prisma.usuarioConta.create({
        data: {
          contaId: origem.contaId,
          usuarioId: destinatario.usuarioId,
          papel: 'TITULAR',
        },
      });
      const cancelada = await service.cancelar(
        pix.transacaoId,
        destinatario.usuarioId,
      );
      expect(cancelada.status).toBe('CANCELADA');
      expect(cancelada.usuarioSolicitanteId).toBe(solicitante.usuarioId);
      const logs = await prisma.logAtividade.findMany();
      expect(logs).toHaveLength(1);
      expect(logs[0].usuarioId).toBe(destinatario.usuarioId);
    });

    it.each(['INATIVO', 'BLOQUEADO'])(
      'recusa titular com status %s',
      async (status) => {
        const { solicitante, pix } = await preparar();
        await prisma.usuario.update({
          where: { usuarioId: solicitante.usuarioId },
          data: { status },
        });
        await expect(
          service.cancelar(pix.transacaoId, solicitante.usuarioId),
        ).rejects.toMatchObject({ status: 403 });
        expect(await prisma.logAtividade.count()).toBe(0);
      },
    );

    it('permite ao titular ativo cancelar mesmo quando a conta está bloqueada', async () => {
      const { origem, solicitante, pix } = await preparar();
      await prisma.conta.update({
        where: { contaId: origem.contaId },
        data: { status: 'BLOQUEADA' },
      });
      expect(
        (await service.cancelar(pix.transacaoId, solicitante.usuarioId)).status,
      ).toBe('CANCELADA');
    });

    it.each(['EFETIVADA', 'FALHA', 'CANCELADA'])(
      'recusa estado %s sem alterar o registro',
      async (status) => {
        const { origem, destino, solicitante, pix } = await preparar();
        await prisma.transacaoPix.update({
          where: { transacaoId: pix.transacaoId },
          data: { status },
        });
        await expect(
          service.cancelar(pix.transacaoId, solicitante.usuarioId),
        ).rejects.toMatchObject({
          status: 400,
          message: 'Apenas transações pendentes podem ser canceladas',
        });
        expect(
          (
            await prisma.transacaoPix.findUniqueOrThrow({
              where: { transacaoId: pix.transacaoId },
            })
          ).status,
        ).toBe(status);
        expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
        expect(await prisma.logAtividade.count()).toBe(0);
      },
    );

    it('retorna 404 quando o PIX não existe', async () => {
      await expect(
        service.cancelar(randomUUID(), randomUUID()),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it('valida a posse antes de informar um estado não cancelável', async () => {
      const { destinatario, pix } = await preparar();
      await prisma.transacaoPix.update({
        where: { transacaoId: pix.transacaoId },
        data: { status: 'EFETIVADA' },
      });
      await expect(
        service.cancelar(pix.transacaoId, destinatario.usuarioId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('desfaz o cancelamento quando a gravação do log falha', async () => {
      const { origem, destino, solicitante, pix } = await preparar();
      await prisma.$executeRaw`
        CREATE FUNCTION falhar_log_cancelamento() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Falha técnica simulada'; END; $$
      `;
      await prisma.$executeRaw`
        CREATE TRIGGER falhar_log_cancelamento BEFORE INSERT ON "LogAtividade"
        FOR EACH ROW EXECUTE FUNCTION falhar_log_cancelamento()
      `;
      try {
        await expect(
          service.cancelar(pix.transacaoId, solicitante.usuarioId),
        ).rejects.toThrow();
        expect(
          (
            await prisma.transacaoPix.findUniqueOrThrow({
              where: { transacaoId: pix.transacaoId },
            })
          ).status,
        ).toBe('PENDENTE');
        expect(await saldos(origem.contaId, destino.contaId)).toEqual([100, 0]);
        expect(await prisma.logAtividade.count()).toBe(0);
      } finally {
        await prisma.$executeRaw`DROP FUNCTION falhar_log_cancelamento() CASCADE`;
      }
    });

    it('dois cancelamentos concorrentes geram apenas uma alteração e um log', async () => {
      const { solicitante, pix } = await preparar();
      const resultados = await Promise.allSettled([
        service.cancelar(pix.transacaoId, solicitante.usuarioId),
        outroService.cancelar(pix.transacaoId, solicitante.usuarioId),
      ]);
      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(
        1,
      );
      expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(await prisma.logAtividade.count()).toBe(1);
    });

    it.each(['cancelar', 'executar'] as const)(
      'mantém um único resultado na disputa com o executor, iniciando por %s',
      async (primeiro) => {
        const { origem, destino, solicitante, pix } = await preparar();
        const cancelar = () =>
          service.cancelar(pix.transacaoId, solicitante.usuarioId);
        const executar = () => outroService.executar(pix.transacaoId);
        const operacoes =
          primeiro === 'cancelar' ? [cancelar, executar] : [executar, cancelar];
        const resultados = await Promise.allSettled(
          operacoes.map((operacao) => operacao()),
        );
        const salvo = await prisma.transacaoPix.findUniqueOrThrow({
          where: { transacaoId: pix.transacaoId },
        });
        const logs = await prisma.logAtividade.findMany();
        expect(logs).toHaveLength(1);
        if (salvo.status === 'CANCELADA') {
          expect(await saldos(origem.contaId, destino.contaId)).toEqual([
            100, 0,
          ]);
          expect(logs[0].acao).toBe('CANCELAMENTO_PIX_AGENDADO');
          expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);
          expect(emitir).not.toHaveBeenCalled();
        } else {
          expect(salvo.status).toBe('EFETIVADA');
          expect(await saldos(origem.contaId, destino.contaId)).toEqual([
            60, 40,
          ]);
          expect(logs[0].acao).toBe('EXECUCAO_PIX_AGENDADO');
          const rejeitado = resultados.find((r) => r.status === 'rejected');
          expect(rejeitado).toMatchObject({ reason: { status: 400 } });
          expect(emitir).toHaveBeenCalledTimes(1);
        }
      },
    );
  });
});
