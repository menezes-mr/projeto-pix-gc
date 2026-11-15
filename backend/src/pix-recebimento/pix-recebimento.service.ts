import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RecebimentoPixDto } from './dto/recebimento-pix.dto';

@Injectable()
export class PixRecebimentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async receberPix(
    contexto: { contaOrigemId: string; usuarioId: string },
    dto: RecebimentoPixDto,
  ) {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.PIX_SIMULACAO_HABILITADA !== 'true'
    ) {
      throw new ForbiddenException('Simulação de recebimento desabilitada');
    }
    const valor = new Prisma.Decimal(dto.valor);
    if (valor.decimalPlaces() > 2 || valor.lte(0))
      throw new BadRequestException('Valor inválido');
    try {
      const transacao = await this.prisma.$transaction(async (tx) => {
        const chave = await tx.chavePix.findFirst({
          where: {
            valorChave: dto.chavePixDestino,
            contaId: contexto.contaOrigemId,
            status: 'ATIVA',
            conta: {
              status: 'ATIVA',
              usuarios: {
                some: {
                  usuarioId: contexto.usuarioId,
                  papel: 'TITULAR',
                  usuario: { status: 'ATIVO' },
                },
              },
            },
          },
        });
        if (!chave)
          throw new ForbiddenException(
            'Chave ativa da conta autenticada não encontrada',
          );
        const criada = await tx.transacaoPix.create({
          data: {
            transacaoExternaId: dto.transacaoExternaId,
            chavePixUtilizada: chave.valorChave,
            valor,
            tipoOperacao: 'RECEBIMENTO_SIMULADO',
            status: 'EFETIVADA',
            contaDestinoId: contexto.contaOrigemId,
            usuarioSolicitanteId: contexto.usuarioId,
            dataEfetivacao: new Date(),
          },
        });
        await tx.conta.update({
          where: { contaId: contexto.contaOrigemId },
          data: { saldo: { increment: valor } },
        });
        await tx.logAtividade.create({
          data: {
            usuarioId: contexto.usuarioId,
            acao: 'RECEBIMENTO_PIX_SIMULADO',
          },
        });
        return criada;
      });
      this.eventEmitter.emit('pix.efetivado', transacao);
      return transacao;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Simulação já registrada');
      throw error;
    }
  }
}
