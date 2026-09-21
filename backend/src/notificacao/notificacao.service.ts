import { Injectable, Logger } from '@nestjs/common';
import type { TransacaoPix, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processarNotificacaoPix(transacao: TransacaoPix) {
    try {
      const [remetentes, destinatarios] = await Promise.all([
        this.buscarTitulares(transacao.contaOrigemId),
        this.buscarTitulares(transacao.contaDestinoId),
      ]);

      const valor = Number(transacao.valor).toFixed(2).replace('.', ',');

      for (const usuario of remetentes) {
        this.notificarUsuario(usuario, `Você enviou um PIX de R$ ${valor}.`);
      }

      for (const usuario of destinatarios) {
        this.notificarUsuario(usuario, `Você recebeu um PIX de R$ ${valor}.`);
      }
    } catch (error) {
      // Falha na notificação nunca deve afetar o PIX já efetivado
      this.logger.error('Falha ao processar notificação de PIX', error);
    }
  }

  private async buscarTitulares(contaId: string | null): Promise<Usuario[]> {
    if (!contaId) return [];

    const vinculos = await this.prisma.usuarioConta.findMany({
      where: { contaId, papel: 'TITULAR' },
      include: { usuario: true },
    });

    return vinculos.map((vinculo) => vinculo.usuario);
  }

  private notificarUsuario(usuario: Usuario, mensagem: string) {
    if (usuario.receberEmail) {
      this.enviarEmailMock(usuario.email, mensagem);
    }
    if (usuario.receberSms && usuario.telefone) {
      this.enviarSmsMock(usuario.telefone, mensagem);
    }
    if (usuario.receberPush) {
      this.enviarPushMock(usuario.usuarioId, mensagem);
    }
  }

  private enviarEmailMock(email: string, mensagem: string) {
    console.log(`[EMAIL ENVIADO para ${email}] ${mensagem}`);
  }

  private enviarSmsMock(telefone: string, mensagem: string) {
    console.log(`[SMS ENVIADO para ${telefone}] ${mensagem}`);
  }

  private enviarPushMock(usuarioId: string, mensagem: string) {
    console.log(`[PUSH NOTIFICATION para Usuário ${usuarioId}] ${mensagem}`);
  }
}
