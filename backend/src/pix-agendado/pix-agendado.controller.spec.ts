import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PixAgendadoModule } from './pix-agendado.module';
import { PixAgendadoService } from './pix-agendado.service';

describe('PATCH /pix/agendamentos/:id/cancelar', () => {
  const cancelar = jest.fn();
  const secret = 'segredo-exclusivo-dos-testes-de-cancelamento';
  const secretAnterior = process.env.JWT_SECRET;
  const transacao = { transacaoId: 'pix-id', status: 'CANCELADA', valor: '40' };
  let app: INestApplication<Server>;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const modulo = await Test.createTestingModule({
      imports: [PixAgendadoModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PixAgendadoService)
      .useValue({ cancelar })
      .compile();

    app = modulo.createNestApplication();
    await app.init();
    token = await modulo
      .get(JwtService)
      .signAsync(
        { sub: 'usuario-autenticado', contaOrigemId: 'conta-do-token' },
        { secret, expiresIn: '5m' },
      );
  });

  beforeEach(() => {
    cancelar.mockReset();
    cancelar.mockResolvedValue(transacao);
  });

  afterAll(async () => {
    await app?.close();
    if (secretAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secretAnterior;
  });

  it('retorna HTTP 200 com a mensagem e os dados atualizados', async () => {
    await request(app.getHttpServer())
      .patch('/pix/agendamentos/pix-id/cancelar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ mensagem: 'Transação PIX cancelada com sucesso', transacao });

    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(cancelar).toHaveBeenCalledWith('pix-id', 'usuario-autenticado');
  });

  it('usa a identidade do token, ignorando tentativas de trocar o usuário no corpo', async () => {
    await request(app.getHttpServer())
      .patch('/pix/agendamentos/pix-id/cancelar')
      .set('Authorization', `Bearer ${token}`)
      .send({ usuarioId: 'outra-pessoa', contaOrigemId: 'outra-conta' })
      .expect(200);

    expect(cancelar).toHaveBeenCalledWith('pix-id', 'usuario-autenticado');
  });

  it('retorna HTTP 401 sem autenticação', async () => {
    await request(app.getHttpServer())
      .patch('/pix/agendamentos/pix-id/cancelar')
      .expect(401);

    expect(cancelar).not.toHaveBeenCalled();
  });

  it('retorna HTTP 401 para um token inválido', async () => {
    await request(app.getHttpServer())
      .patch('/pix/agendamentos/pix-id/cancelar')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);

    expect(cancelar).not.toHaveBeenCalled();
  });

  it.each([
    new BadRequestException('Apenas transações pendentes podem ser canceladas'),
    new ForbiddenException('O usuário não é titular da conta de origem'),
    new NotFoundException('Transação PIX não encontrada'),
  ])(
    'preserva o código HTTP e a mensagem da regra de negócio: %s',
    async (erro) => {
      cancelar.mockRejectedValueOnce(erro);

      const resposta = await request(app.getHttpServer())
        .patch('/pix/agendamentos/pix-id/cancelar')
        .set('Authorization', `Bearer ${token}`)
        .expect(erro.getStatus());
      expect(resposta.body).toEqual(erro.getResponse());
    },
  );
});
