import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HistoricoPixService } from '../src/shared/historico-pix/historico-pix.service';
import { PixTransferenciaService } from '../src/pix-transferencia/pix-transferencia.service';
import { PixRecebimentoService } from '../src/pix-recebimento/pix-recebimento.service';

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
