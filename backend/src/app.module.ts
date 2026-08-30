import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { PixKeyModule } from './pix-key/pix.key.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [PrismaModule, ContaModule, UsuariosModule, PixKeyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}