import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PixAgendadoModule } from './pix-agendado/pix-agendado.module';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { PixKeyModule } from './pix-key/pix-key.module';
import { PixRecebimentoModule } from './pix-recebimento/pix-recebimento.module';
import { PixTransferenciaModule } from './pix-transferencia/pix-transferencia.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { NotificacaoModule } from './notificacao/notificacao.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PixAgendadoModule,
    PrismaModule,
    ContaModule,
    UsuariosModule,
    PixKeyModule,
    PixRecebimentoModule,
    PixTransferenciaModule,
    NotificacaoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
