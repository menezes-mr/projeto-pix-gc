import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificacaoService } from '../notificacao.service';
import type { TransacaoPix } from '@prisma/client';

@Injectable()
export class NotificacaoListener {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  @OnEvent('pix.efetivado', { async: true })
  async handlePixEfetivado(transacao: TransacaoPix) {
    await this.notificacaoService.processarNotificacaoPix(transacao);
  }
}
