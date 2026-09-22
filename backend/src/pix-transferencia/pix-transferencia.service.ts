import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { StatusTransacao } from '../common/enums/status.enum';
import { TipoOperacao } from '../common/enums/tipo-operacao.enum';
import { PrismaService } from '../prisma/prisma.service';
import { HistoricoPixService } from '../shared/historico-pix/historico-pix.service';
import { TransferenciaPixDto } from './dto/transferencia-pix.dto';

export interface ContextoTransferenciaPix {
  contaOrigemId: string;
  usuarioId: string;
}

@Injectable()
export class PixTransferenciaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly historicoPixService: HistoricoPixService,
  ) {}

  async transferir(
    contexto: ContextoTransferenciaPix,
    dto: TransferenciaPixDto,
  ) {
    const { contaOrigemId, usuarioId } = contexto;
    const { chavePixDestino } = dto;
    const valor = new Prisma.Decimal(dto.valor);
    const dataAgendamento =
      dto.dataAgendamento == null ? null : new Date(dto.dataAgendamento);

    if (dataAgendamento) {
      const dataInvalida = Number.isNaN(dataAgendamento.getTime());
      const dataFutura = dataAgendamento.getTime() > Date.now();

      if (dataInvalida || !dataFutura) {
        throw new BadRequestException(
          'A data de agendamento deve ser uma data futura válida',
        );
      }
    }

    const transacao = await this.prisma.$transaction(async (tx) => {
      const contaOrigem = await tx.conta.findUnique({
        where: { contaId: contaOrigemId },
        include: {
          usuarios: {
            where: { usuarioId },
            include: { usuario: true },
          },
        },
      });

      if (!contaOrigem) {
        throw new NotFoundException('Conta de origem não encontrada');
      }

      const vinculo = contaOrigem.usuarios[0];

      if (!vinculo || vinculo.papel !== 'TITULAR') {
        throw new ForbiddenException(
          'O usuário não é titular da conta de origem',
        );
      }

      if (
        contaOrigem.status !== 'ATIVA' ||
        vinculo.usuario.status !== 'ATIVO'
      ) {
        throw new ForbiddenException(
          'A conta de origem e o usuário precisam estar ativos',
        );
      }

      if (valor.greaterThan(contaOrigem.limiteDiarioPix)) {
        throw new BadRequestException(
          'O valor ultrapassa o limite diário PIX da conta',
        );
      }

      const chaveDestino = await tx.chavePix.findUnique({
        where: { valorChave: chavePixDestino },
        include: { conta: true },
      });

      if (
        !chaveDestino ||
        chaveDestino.status !== 'ATIVA' ||
        chaveDestino.conta.status !== 'ATIVA'
      ) {
        throw new NotFoundException('Chave PIX de destino inválida');
      }

      if (chaveDestino.contaId === contaOrigemId) {
        throw new BadRequestException(
          'Não é possível transferir para a própria conta',
        );
      }

      if (!dataAgendamento) {
        const contaOrigemAtualizada = await tx.conta.update({
          where: { contaId: contaOrigemId },
          data: {
            saldo: { decrement: valor },
          },
        });

        if (contaOrigemAtualizada.saldo.lessThan(0)) {
          throw new BadRequestException('Saldo insuficiente');
        }

        await tx.conta.update({
          where: { contaId: chaveDestino.contaId },
          data: {
            saldo: { increment: valor },
          },
        });
      }

      const transacao = await this.historicoPixService.registrarTransacao(
        {
          chavePixUtilizada: chavePixDestino,
          valor,
          tipoOperacao: TipoOperacao.TRANSFERENCIA_SAIDA,
          status: dataAgendamento
            ? StatusTransacao.PENDENTE
            : StatusTransacao.EFETIVADA,
          ...(dataAgendamento ? { dataAgendamento } : {}),
          contaOrigemId,
          contaDestinoId: chaveDestino.contaId,
        },
        tx,
      );

      await tx.logAtividade.create({
        data: {
          acao: 'TRANSFERENCIA PIX',
          usuarioId,
        },
      });

      return transacao;
    });

    if (!dataAgendamento) {
      this.eventEmitter.emit('pix.efetivado', transacao);
    }

    return transacao;
  }
}
