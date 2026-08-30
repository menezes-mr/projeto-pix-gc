import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { PixKeyModule } from './pix-key/pix-key.module';
import { PixRecebimentoModule } from './pix-recebimento/pix-recebimento.module';
import { PixTransferenciaModule } from './pix-transferencia/pix-transferencia.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    PrismaModule,
    ContaModule,
    UsuariosModule,
    PixKeyModule,
    PixRecebimentoModule,
    PixTransferenciaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
