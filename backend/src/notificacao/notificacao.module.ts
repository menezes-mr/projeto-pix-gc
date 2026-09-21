import { Module } from '@nestjs/common';
import { NotificacaoService } from './notificacao.service';
import { NotificacaoListener } from './listeners/notificacao.listener';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificacaoService, NotificacaoListener],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
