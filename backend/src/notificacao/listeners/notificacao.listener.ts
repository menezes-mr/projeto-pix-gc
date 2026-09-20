import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificacaoService } from '../notificacao.service';

@Injectable()
export class NotificacaoListener {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  @OnEvent('pix.efetivado', { async: true })
  async handlePixEfetivadoEvent(event: {
    transacaoId: string;
    valor: number;
    remetenteId: string;
    destinatarioId: string;
  }) {
    await this.notificacaoService.processarNotificacaoPix(event);
  }
}
