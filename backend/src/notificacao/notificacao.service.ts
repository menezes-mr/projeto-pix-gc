import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processarNotificacaoPix(transacaoData: {
    transacaoId: string;
    valor: number;
    remetenteId: string;
    destinatarioId: string;
  }) {
    const [remetente, destinatario] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { usuarioId: transacaoData.remetenteId },
      }),
      this.prisma.usuario.findUnique({
        where: { usuarioId: transacaoData.destinatarioId },
      }),
    ]);

    if (remetente) {
      const msg = `Você enviou um PIX no valor de R$ ${transacaoData.valor.toFixed(2)}.`;
      this.enviarCanaisPermitidos(remetente, msg);
    }

    if (destinatario) {
      const msg = `Você recebeu um PIX no valor de R$ ${transacaoData.valor.toFixed(2)}.`;
      this.enviarCanaisPermitidos(destinatario, msg);
    }
  }

  private enviarCanaisPermitidos(
    usuario: {
      email?: string | null;
      telefone?: string | null;
      receberEmail?: boolean;
      receberSms?: boolean;
      receberPush?: boolean;
      nomeCompleto?: string | null;
    },
    mensagem: string,
  ) {
    if (usuario.receberEmail && usuario.email) {
      this.enviarEmailMock(usuario.email, mensagem);
    }
    if (usuario.receberSms && usuario.telefone) {
      this.enviarSmsMock(usuario.telefone, mensagem);
    }
    if (usuario.receberPush) {
      this.enviarPushMock(usuario.nomeCompleto ?? 'Usuário', mensagem);
    }
  }

  private enviarEmailMock(email: string, mensagem: string) {
    this.logger.log(`[EMAIL ENVIADO para ${email}] ${mensagem}`);
  }

  private enviarSmsMock(telefone: string, mensagem: string) {
    this.logger.log(`[SMS ENVIADO para ${telefone}] ${mensagem}`);
  }

  private enviarPushMock(nomeUsuario: string, mensagem: string) {
    this.logger.log(`[PUSH NOTIFICATION para ${nomeUsuario}] ${mensagem}`);
  }
}
