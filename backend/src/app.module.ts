import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { ContaModule } from './conta/conta.module';

@Module({
  imports: [PrismaModule, ContaModule, UsuariosModule],
  controllers: [],
  providers: [],
})
export class AppModule {}