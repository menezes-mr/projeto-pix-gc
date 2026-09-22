import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PixAgendadoService } from './pix-agendado.service';

@Module({
  imports: [PrismaModule],
  providers: [PixAgendadoService],
  exports: [PixAgendadoService],
})
export class PixAgendadoModule {}
