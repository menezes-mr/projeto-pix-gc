import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { RelatorioTransacoesService } from './relatorio-transacoes.service';
import { RelatorioTransacoesController } from './relatorio-transacoes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [UsuariosController, RelatorioTransacoesController],
  providers: [UsuariosService, RelatorioTransacoesService],
})
export class UsuariosModule {}
