import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ContaService } from '../src/conta/conta.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { HistoricoPixService } from '../src/shared/historico-pix/historico-pix.service';
import { limiteDiarioExcedido } from '../src/shared/historico-pix/limite-diario-pix';
import { PixTransferenciaService } from '../src/pix-transferencia/pix-transferencia.service';
import { PixRecebimentoService } from '../src/pix-recebimento/pix-recebimento.service';
import { PixAgendadoService } from '../src/pix-agendado/pix-agendado.service';

const databaseUrl = process.env.PIX_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error('Defina PIX_TEST_DATABASE_URL para um PostgreSQL de testes.');
const schema = `pix_soa3_${randomUUID().replaceAll('-', '')}`;
const url = new URL(databaseUrl);
url.searchParams.set('schema', schema);

describe('SOA 3 no PostgreSQL', () => {
  const prisma = new PrismaService({ datasources: { db: { url: url.href } } });
  const outroPrisma = new PrismaService({
    datasources: { db: { url: url.href } },
  });
  const eventos = new EventEmitter2();
  const service = new PixTransferenciaService(
    prisma,
    eventos,
    new HistoricoPixService(),
  );
  const concorrente = new PixTransferenciaService(
    outroPrisma,
    eventos,
    new HistoricoPixService(),
  );
  const recebimento = new PixRecebimentoService(prisma, eventos);
  const envAnterior = process.env.PIX_SIMULACAO_HABILITADA;

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
    process.env.PIX_SIMULACAO_HABILITADA = 'true';
  });
  afterAll(async () => {
    if (envAnterior === undefined) delete process.env.PIX_SIMULACAO_HABILITADA;
    else process.env.PIX_SIMULACAO_HABILITADA = envAnterior;
    await outroPrisma.$disconnect();
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$disconnect();
  });
  async function preparar() {
    const usuario = async () =>
      prisma.usuario.create({
        data: {
          cpfCnpj: randomUUID(),
          nomeCompleto: 'Pessoa',
          email: `${randomUUID()}@example.com`,
          senha: 'teste',
        },
      });
    const a = await usuario();
    const b = await usuario();
    const conta = async (usuarioId: string, saldo: number) =>
      prisma.conta.create({
        data: {
          agencia: '0001',
          numeroConta: randomUUID(),
          saldo,
          usuarios: { create: { usuarioId, papel: 'TITULAR' } },
        },
      });
    const origem = await conta(a.usuarioId, 100);
    const destino = await conta(b.usuarioId, 0);
    const chave = await prisma.chavePix.create({
      data: {
        tipoChave: 'ALEATORIA',
        valorChave: randomUUID(),
        contaId: destino.contaId,
      },
    });
    const pix = await service.transferir(
      { contaOrigemId: origem.contaId, usuarioId: a.usuarioId },
      { chavePixDestino: chave.valorChave, valor: 25.5 },
    );
    return {
      a,
      b,
      origem,
      destino,
      chave,
      pix,
      contexto: { contaOrigemId: destino.contaId, usuarioId: b.usuarioId },
    };
  }
  async function saldo(id: string) {
    return (
      await prisma.conta.findUniqueOrThrow({ where: { contaId: id } })
    ).saldo.toNumber();
  }

  it('exige aceite do destinatário e impede respostas concorrentes', async () => {
    const d = await preparar();
    const contas = new ContaService(prisma);
    const convite = await contas.adicionarCotitular(
      d.origem.contaId,
      d.a.usuarioId,
      { identificador: d.b.email, papel: 'OPERADOR' },
    );
    expect(
      await prisma.usuarioConta.findUnique({
        where: {
          usuarioId_contaId: {
            usuarioId: d.b.usuarioId,
            contaId: d.origem.contaId,
          },
        },
      }),
    ).toBeNull();
    await expect(
      contas.adicionarCotitular(d.origem.contaId, d.a.usuarioId, {
        identificador: d.b.email,
        papel: 'OPERADOR',
      }),
    ).rejects.toThrow();
    await expect(
      contas.responderConvite(convite.conviteId, d.a.usuarioId, true),
    ).rejects.toThrow();
    const resultados = await Promise.allSettled([
      contas.responderConvite(convite.conviteId, d.b.usuarioId, true),
      contas.responderConvite(convite.conviteId, d.b.usuarioId, true),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.usuarioConta.findUnique({
        where: {
          usuarioId_contaId: {
            usuarioId: d.b.usuarioId,
            contaId: d.origem.contaId,
          },
        },
      }),
    ).toMatchObject({ papel: 'OPERADOR' });
  });

  it('permite recusa e impede aceite após a expiração', async () => {
    const d = await preparar();
    const contas = new ContaService(prisma);
    const dto = { identificador: d.b.email, papel: 'DEPENDENTE' };
    const convite = await contas.adicionarCotitular(
      d.origem.contaId,
      d.a.usuarioId,
      dto,
    );
    await contas.responderConvite(convite.conviteId, d.b.usuarioId, false);
    expect(
      await prisma.usuarioConta.findUnique({
        where: {
          usuarioId_contaId: {
            usuarioId: d.b.usuarioId,
            contaId: d.origem.contaId,
          },
        },
      }),
    ).toBeNull();
    const renovado = await contas.adicionarCotitular(
      d.origem.contaId,
      d.a.usuarioId,
      dto,
    );
    await prisma.conviteCotitular.update({
      where: { conviteId: renovado.conviteId },
      data: { expiraEm: new Date(0) },
    });
    await expect(
      contas.responderConvite(renovado.conviteId, d.b.usuarioId, true),
    ).rejects.toThrow();
  });

  it('aplica o limite diário entre transferências simultâneas da mesma conta', async () => {
    const d = await preparar();
    await prisma.conta.update({
      where: { contaId: d.origem.contaId },
      data: { limiteDiarioPix: 60 },
    });
    const contexto = {
      contaOrigemId: d.origem.contaId,
      usuarioId: d.a.usuarioId,
    };
    const dto = { chavePixDestino: d.chave.valorChave, valor: 20 };
    const resultados = await Promise.allSettled([
      service.transferir(contexto, dto),
      concorrente.transferir(contexto, dto),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await saldo(d.origem.contaId)).toBe(54.5);
    expect(await saldo(d.destino.contaId)).toBe(45.5);
  });

  it('compartilha o limite entre uma transferência imediata e um agendamento concorrente', async () => {
    const d = await preparar();
    await prisma.conta.update({
      where: { contaId: d.origem.contaId },
      data: { limiteDiarioPix: 60 },
    });
    const pendente = await prisma.transacaoPix.create({
      data: {
        contaOrigemId: d.origem.contaId,
        contaDestinoId: d.destino.contaId,
        usuarioSolicitanteId: d.a.usuarioId,
        valor: 20,
        status: 'PENDENTE',
        tipoOperacao: 'TRANSFERENCIA_SAIDA',
        dataAgendamento: new Date(Date.now() - 1000),
      },
    });
    const executor = new PixAgendadoService(outroPrisma, eventos);
    await Promise.allSettled([
      service.transferir(
        { contaOrigemId: d.origem.contaId, usuarioId: d.a.usuarioId },
        { chavePixDestino: d.chave.valorChave, valor: 20 },
      ),
      executor.executar(pendente.transacaoId),
    ]);
    expect(await saldo(d.origem.contaId)).toBe(54.5);
    expect(await saldo(d.destino.contaId)).toBe(45.5);
    expect(
      await prisma.transacaoPix.count({
        where: { contaOrigemId: d.origem.contaId, status: 'EFETIVADA' },
      }),
    ).toBe(2);
  });

  it('reinicia o limite à meia-noite de Brasília', async () => {
    const d = await preparar();
    await prisma.transacaoPix.create({
      data: {
        contaOrigemId: d.origem.contaId,
        contaDestinoId: d.destino.contaId,
        valor: 9,
        status: 'EFETIVADA',
        tipoOperacao: 'TRANSFERENCIA_SAIDA',
        dataEfetivacao: new Date('2025-01-02T02:30:00.000Z'),
      },
    });
    const consultar = (agora: string) =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL TIME ZONE 'Pacific/Auckland'`;
        return limiteDiarioExcedido(
          tx,
          d.origem.contaId,
          new Prisma.Decimal(2),
          new Prisma.Decimal(10),
          new Date(agora),
        );
      });
    await expect(consultar('2025-01-02T02:59:59.000Z')).resolves.toBe(true);
    await expect(consultar('2025-01-02T03:00:00.000Z')).resolves.toBe(false);
  });

  it('transfere e permite uma única devolução em chamadas simultâneas', async () => {
    const d = await preparar();
    expect(await saldo(d.origem.contaId)).toBe(74.5);
    expect(await saldo(d.destino.contaId)).toBe(25.5);
    const dto = {
      transacaoIdOriginal: d.pix.transacaoId,
      motivo: 'Devolução integral',
    };
    const resultados = await Promise.allSettled([
      service.estornar(d.contexto, dto),
      concorrente.estornar(d.contexto, dto),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(await saldo(d.origem.contaId)).toBe(100);
    expect(await saldo(d.destino.contaId)).toBe(0);
    const original = await prisma.transacaoPix.findUniqueOrThrow({
      where: { transacaoId: d.pix.transacaoId },
      include: { transacaoEstorno: true },
    });
    expect(original.transacaoEstorno).toMatchObject({
      tipoOperacao: 'ESTORNO',
      motivoEstorno: dto.motivo,
      contaOrigemId: d.destino.contaId,
      contaDestinoId: d.origem.contaId,
    });
    expect(
      await prisma.logAtividade.count({
        where: { usuarioId: d.b.usuarioId, acao: 'ESTORNO_PIX' },
      }),
    ).toBe(1);
    await expect(service.estornar(d.contexto, dto)).rejects.toThrow(
      'já estornada',
    );
  });
  it('reverte saldos e registros quando o log falha após a movimentação', async () => {
    const d = await preparar();
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${schema}".falhar_log() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."acao" = 'ESTORNO_PIX' THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER falhar_log BEFORE INSERT ON "${schema}"."LogAtividade" FOR EACH ROW EXECUTE FUNCTION "${schema}".falhar_log()`,
    );
    try {
      await expect(
        service.estornar(d.contexto, {
          transacaoIdOriginal: d.pix.transacaoId,
        }),
      ).rejects.toThrow();
      expect(await saldo(d.origem.contaId)).toBe(74.5);
      expect(await saldo(d.destino.contaId)).toBe(25.5);
      const original = await prisma.transacaoPix.findUniqueOrThrow({
        where: { transacaoId: d.pix.transacaoId },
      });
      expect(original.transacaoEstornoId).toBeNull();
      expect(
        await prisma.transacaoPix.count({
          where: { contaOrigemId: d.destino.contaId, tipoOperacao: 'ESTORNO' },
        }),
      ).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER falhar_log ON "${schema}"."LogAtividade"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION "${schema}".falhar_log()`);
    }
  });
  it('restringe a simulação à própria conta e registra o crédito uma única vez', async () => {
    const d = await preparar();
    const dto = {
      chavePixDestino: d.chave.valorChave,
      valor: 10.25,
      transacaoExternaId: randomUUID(),
    };
    await expect(
      recebimento.receberPix(
        { contaOrigemId: d.origem.contaId, usuarioId: d.a.usuarioId },
        dto,
      ),
    ).rejects.toThrow('Chave ativa');
    const result = await recebimento.receberPix(d.contexto, dto);
    expect(result.tipoOperacao).toBe('RECEBIMENTO_SIMULADO');
    expect(await saldo(d.destino.contaId)).toBe(35.75);
    await expect(recebimento.receberPix(d.contexto, dto)).rejects.toThrow(
      'já registrada',
    );
    expect(await saldo(d.destino.contaId)).toBe(35.75);
  });

  it('bloqueia simulações desabilitadas e em produção', async () => {
    const d = await preparar();
    const dto = {
      chavePixDestino: d.chave.valorChave,
      valor: 1,
      transacaoExternaId: randomUUID(),
    };
    const ambiente = process.env.NODE_ENV;
    try {
      process.env.PIX_SIMULACAO_HABILITADA = 'false';
      await expect(recebimento.receberPix(d.contexto, dto)).rejects.toThrow(
        'desabilitada',
      );
      process.env.PIX_SIMULACAO_HABILITADA = 'true';
      process.env.NODE_ENV = 'production';
      await expect(recebimento.receberPix(d.contexto, dto)).rejects.toThrow(
        'desabilitada',
      );
      expect(await saldo(d.destino.contaId)).toBe(25.5);
    } finally {
      process.env.PIX_SIMULACAO_HABILITADA = 'true';
      process.env.NODE_ENV = ambiente;
    }
  });

  it('valida autenticação e fluxo completo pelas rotas HTTP', async () => {
    const d = await preparar();
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    const app = modulo.createNestApplication<INestApplication<App>>();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    try {
      const jwt = new JwtService({
        secret: process.env.JWT_SECRET || 'chave-secreta-padrao-dev',
      });
      const tokenA = jwt.sign({
        sub: d.a.usuarioId,
        email: d.a.email,
        contaId: d.origem.contaId,
      });
      const tokenB = jwt.sign({
        sub: d.b.usuarioId,
        email: d.b.email,
        contaId: d.destino.contaId,
      });
      await request(app.getHttpServer())
        .get(`/usuarios/${d.a.usuarioId}`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`/contas/${d.origem.contaId}/saldo`)
        .set('x-usuario-id', d.a.usuarioId)
        .expect(401);
      await request(app.getHttpServer())
        .patch(`/usuarios/${d.a.usuarioId}`)
        .auth(tokenB, { type: 'bearer' })
        .send({ senha: 'SenhaNova123!' })
        .expect(403);
      await request(app.getHttpServer())
        .get(`/contas/${d.origem.contaId}`)
        .auth(tokenB, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/contas/${d.origem.contaId}`)
        .auth(tokenB, { type: 'bearer' })
        .send({ limiteDiarioPix: 9999 })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/contas/${d.origem.contaId}`)
        .auth(tokenB, { type: 'bearer' })
        .expect(403);
      const proprioUsuario = await request(app.getHttpServer())
        .get(`/usuarios/${d.a.usuarioId}`)
        .auth(tokenA, { type: 'bearer' })
        .expect(200);
      expect(proprioUsuario.body).not.toHaveProperty('senha');
      await request(app.getHttpServer())
        .patch(`/usuarios/${d.a.usuarioId}`)
        .auth(tokenA, { type: 'bearer' })
        .send({ nomeCompleto: 'Nome atualizado' })
        .expect(200);
      await request(app.getHttpServer())
        .get(`/contas/${d.origem.contaId}`)
        .auth(tokenA, { type: 'bearer' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/contas/${d.origem.contaId}`)
        .auth(tokenA, { type: 'bearer' })
        .send({ limiteDiarioPix: 1000 })
        .expect(200);
      const relatorio =
        '/admin/relatorios/transacoes?dataInicio=2020-01-01&dataFim=2030-01-01';
      await request(app.getHttpServer())
        .get(relatorio)
        .set('x-user-role', 'ADMIN')
        .expect(401);
      await request(app.getHttpServer())
        .get(relatorio)
        .auth(tokenA, { type: 'bearer' })
        .set('x-user-role', 'ADMIN')
        .expect(403);
      await prisma.usuario.update({
        where: { usuarioId: d.a.usuarioId },
        data: { papelSistema: 'ADMIN' },
      });
      await request(app.getHttpServer())
        .get(relatorio)
        .auth(tokenA, { type: 'bearer' })
        .expect(200);
      await prisma.usuario.update({
        where: { usuarioId: d.a.usuarioId },
        data: { papelSistema: 'USUARIO' },
      });
      await request(app.getHttpServer())
        .get(relatorio)
        .auth(tokenA, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/pix/estorno')
        .send({ transacaoIdOriginal: d.pix.transacaoId })
        .expect(401);
      const enviada = await request(app.getHttpServer())
        .post('/pix/transferencia')
        .auth(tokenA, { type: 'bearer' })
        .send({ chavePixDestino: d.chave.valorChave, valor: 10 })
        .expect(200);
      const id = (enviada.body as { transacaoId: string }).transacaoId;
      await request(app.getHttpServer())
        .post('/pix/estorno')
        .auth(tokenA, { type: 'bearer' })
        .send({ transacaoIdOriginal: id })
        .expect(403);
      await request(app.getHttpServer())
        .post('/pix/estorno')
        .auth(tokenB, { type: 'bearer' })
        .send({ transacaoIdOriginal: 'invalido' })
        .expect(400);
      const extrato = await request(app.getHttpServer())
        .get(`/contas/${d.destino.contaId}/transacoes`)
        .auth(tokenB, { type: 'bearer' })
        .expect(200);
      expect(
        (extrato.body as { data: { transacaoId: string }[] }).data.some(
          (item) => item.transacaoId === id,
        ),
      ).toBe(true);
      await request(app.getHttpServer())
        .post('/pix/estorno')
        .auth(tokenB, { type: 'bearer' })
        .send({ transacaoIdOriginal: id, motivo: 'Teste HTTP' })
        .expect(200);
      await request(app.getHttpServer())
        .post('/pix/estorno')
        .auth(tokenB, { type: 'bearer' })
        .send({ transacaoIdOriginal: id })
        .expect(409);
      expect(await saldo(d.origem.contaId)).toBe(74.5);
      expect(await saldo(d.destino.contaId)).toBe(25.5);
      await request(app.getHttpServer())
        .post('/pix/recebimento')
        .auth(tokenA, { type: 'bearer' })
        .send({
          chavePixDestino: d.chave.valorChave,
          valor: 10,
          transacaoExternaId: randomUUID(),
        })
        .expect(403);
      await request(app.getHttpServer())
        .post('/pix/recebimento')
        .auth(tokenB, { type: 'bearer' })
        .send({
          chavePixDestino: d.chave.valorChave,
          valor: 10,
          transacaoExternaId: randomUUID(),
        })
        .expect(200);
      expect(await saldo(d.destino.contaId)).toBe(35.5);
    } finally {
      await app.close();
    }
  });
});
