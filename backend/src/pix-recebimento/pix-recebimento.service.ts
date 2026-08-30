import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixRecebimentoService {
  constructor(private readonly prisma: PrismaService) {}

  async receberPix(
    chavePixDestino: string,
    valor: number,
    transacaoExternaId: string,
  ) {
    const transacaoExistente = await this.prisma.transacaoPix.findFirst({
      where: { transacaoExternaId },
    });
    if (transacaoExistente) {
      return transacaoExistente;
    }

    const chave = await this.prisma.chavePix.findUnique({
      where: { valorChave: chavePixDestino },
      include: { conta: true },
    });

    if (!chave) {
      throw new NotFoundException('Chave PIX não encontrada');
    }
    if (chave.status !== 'ATIVA') {
      throw new BadRequestException('Chave PIX não está ativa');
    }
    if (chave.conta.status !== 'ATIVA') {
      throw new BadRequestException('Conta vinculada à chave não está ativa');
    }

    const [, transacao] = await this.prisma.$transaction([
      this.prisma.conta.update({
        where: { contaId: chave.contaId },
        data: { saldo: { increment: valor } },
      }),
      this.prisma.transacaoPix.create({
        data: {
          transacaoExternaId,
          chavePixUtilizada: chavePixDestino,
          valor,
          tipoOperacao: 'RECEBIMENTO',
          status: 'CONCLUIDA',
          contaOrigemId: null,
          contaDestinoId: chave.contaId,
          dataEfetivacao: new Date(),
        },
      }),
    ]);

    return transacao;
  }
}
