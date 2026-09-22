import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PixAgendadoController } from './pix-agendado.controller';
import { PixAgendadoService } from './pix-agendado.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [PixAgendadoController],
  providers: [PixAgendadoService, JwtAuthGuard],
  exports: [PixAgendadoService],
})
export class PixAgendadoModule {}
