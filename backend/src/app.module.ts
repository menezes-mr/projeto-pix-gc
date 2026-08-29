import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [PrismaModule, UsuariosModule, ContaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}