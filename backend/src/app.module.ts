import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [PrismaModule, UsuariosModule, ContaModule],
})
export class AppModule {}