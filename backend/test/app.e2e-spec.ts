import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('exige autenticação para consultar dados de usuário', () => {
    return request(app.getHttpServer())
      .get('/usuarios/usuario-desconhecido')
      .expect(401);
  });

  it('não aceita um cabeçalho como autorização administrativa', () => {
    return request(app.getHttpServer())
      .get('/admin/relatorios/transacoes')
      .set('x-user-role', 'ADMIN')
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
