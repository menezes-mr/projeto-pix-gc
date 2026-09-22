import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, TransacaoPix } from '@prisma/client';
import {
  PapelUsuarioConta,
  StatusConta,
  StatusTransacao,
  StatusUsuario,
} from '../common/enums/status.enum';
import { TipoOperacao } from '../common/enums/tipo-operacao.enum';
import { PrismaService } from '../prisma/prisma.service';

class RegraNegocioPixError extends Error {}

@Injectable()
export class PixAgendadoService {
  private readonly logger = new Logger(PixAgendadoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async cancelar(transacaoId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Compartilha o bloqueio com o executor: o estado é validado após adquiri-lo.
      const registros = await tx.$queryRaw<Array<{ transacaoId: string }>>`
        SELECT "transacaoId" FROM "TransacaoPix"
        WHERE "transacaoId" = ${transacaoId}
        FOR UPDATE
      `;
      if (registros.length === 0) {
        throw new NotFoundException('Transação PIX não encontrada');
      }

      // Mantém a titularidade e o status do usuário estáveis até o commit.
      await tx.$queryRaw`
        SELECT u."usuarioId" FROM "Usuario" u
        JOIN "UsuarioConta" v ON v."usuarioId" = u."usuarioId"
        JOIN "TransacaoPix" p ON p."contaOrigemId" = v."contaId"
        WHERE p."transacaoId" = ${transacaoId} AND u."usuarioId" = ${usuarioId}
        FOR SHARE OF u, v
      `;
      const transacao = await tx.transacaoPix.findUniqueOrThrow({
        where: { transacaoId },
        include: {
          contaOrigem: {
            include: {
              usuarios: {
                where: { usuarioId },
                include: { usuario: { select: { status: true } } },
              },
            },
          },
        },
      });
      const vinculo = transacao.contaOrigem?.usuarios[0];
      if (vinculo?.papel !== String(PapelUsuarioConta.TITULAR)) {
        throw new ForbiddenException(
          'O usuário não é titular da conta de origem',
        );
      }
      if (vinculo.usuario.status !== String(StatusUsuario.ATIVO)) {
        throw new ForbiddenException(
          'O usuário precisa estar ativo para cancelar',
        );
      }
      if (transacao.status !== String(StatusTransacao.PENDENTE)) {
        throw new BadRequestException(
          'Apenas transações pendentes podem ser canceladas',
        );
      }

      const cancelada = await tx.transacaoPix.update({
        where: { transacaoId },
        data: { status: StatusTransacao.CANCELADA },
      });
      await tx.logAtividade.create({
        data: { acao: 'CANCELAMENTO_PIX_AGENDADO', usuarioId },
      });

      return cancelada;
    });
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'executar-pix-agendados',
    waitForCompletion: true,
  })
  async processarPendentes() {
    const agora = new Date();
    const pendentes = await this.prisma.transacaoPix.findMany({
      where: {
        status: StatusTransacao.PENDENTE,
        dataAgendamento: { lte: agora },
      },
      select: { transacaoId: true },
      orderBy: [{ dataAgendamento: 'asc' }, { transacaoId: 'asc' }],
    });

    for (const { transacaoId } of pendentes) {
      try {
        await this.executar(transacaoId, agora);
      } catch (error) {
        // Erros técnicos mantêm PENDENTE para nova tentativa no próximo ciclo.
        this.logger.error(
          `Erro ao executar PIX agendado ${transacaoId}`,
          error,
        );
      }
    }
  }

  async executar(transacaoId: string, agora = new Date()) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      // O bloqueio dura até o commit; outras instâncias ignoram este PIX.
      // DateTime do Prisma usa timestamp sem fuso, com os valores em UTC.
      const [pendente] = await tx.$queryRaw<TransacaoPix[]>`
        SELECT * FROM "TransacaoPix"
        WHERE "transacaoId" = ${transacaoId}
          AND "status" = ${StatusTransacao.PENDENTE}
          AND "dataAgendamento" <= ${agora.toISOString()}::timestamp
        FOR UPDATE SKIP LOCKED
      `;

      if (!pendente) return null;

      // Permite desfazer o débito e gravar FALHA sem soltar o bloqueio do PIX.
      await tx.$executeRaw`SAVEPOINT movimentacao_pix`;
      try {
        return await this.efetivar(tx, pendente);
      } catch (error) {
        if (!(error instanceof RegraNegocioPixError)) throw error;

        await tx.$executeRaw`ROLLBACK TO SAVEPOINT movimentacao_pix`;
        const falha = await tx.transacaoPix.update({
          where: { transacaoId },
          data: { status: StatusTransacao.FALHA, dataEfetivacao: null },
        });
        this.logger.warn(`PIX agendado ${transacaoId}: ${error.message}`);
        return falha;
      }
    });

    if (resultado?.status === StatusTransacao.EFETIVADA) {
      // Notificações só ocorrem depois do commit e não alteram o resultado.
      try {
        this.eventEmitter.emit('pix.efetivado', resultado);
      } catch (error) {
        this.logger.error('Falha ao notificar PIX agendado efetivado', error);
      }
    }

    return resultado;
  }

  private async efetivar(tx: Prisma.TransactionClient, pendente: TransacaoPix) {
    const { contaOrigemId, contaDestinoId, usuarioSolicitanteId, valor } =
      pendente;
    if (
      !contaOrigemId ||
      !contaDestinoId ||
      !usuarioSolicitanteId ||
      contaOrigemId === contaDestinoId ||
      pendente.tipoOperacao !== String(TipoOperacao.TRANSFERENCIA_SAIDA) ||
      !valor.greaterThan(0)
    ) {
      throw new RegraNegocioPixError(
        'Agendamento sem dados válidos de execução',
      );
    }

    // Ordem estável evita deadlock entre transferências em sentidos opostos.
    await tx.$queryRaw`
      SELECT "contaId" FROM "Conta"
      WHERE "contaId" IN (${contaOrigemId}, ${contaDestinoId})
      ORDER BY "contaId"
      FOR UPDATE
    `;
    // Impede alteração de status ou remoção dos vínculos durante a validação.
    await tx.$queryRaw`
      SELECT u."usuarioId" FROM "Usuario" u
      JOIN "UsuarioConta" v ON v."usuarioId" = u."usuarioId"
      WHERE v."contaId" IN (${contaOrigemId}, ${contaDestinoId})
      ORDER BY u."usuarioId", v."contaId"
      FOR SHARE OF u, v
    `;

    const contas = await tx.conta.findMany({
      where: { contaId: { in: [contaOrigemId, contaDestinoId] } },
      include: { usuarios: { include: { usuario: true } } },
    });
    const origem = contas.find((conta) => conta.contaId === contaOrigemId);
    const destino = contas.find((conta) => conta.contaId === contaDestinoId);

    if (
      !origem ||
      !destino ||
      contas.some(
        (conta) =>
          conta.status !== String(StatusConta.ATIVA) ||
          conta.usuarios.length === 0 ||
          conta.usuarios.some(
            (vinculo) => vinculo.usuario.status !== String(StatusUsuario.ATIVO),
          ),
      )
    ) {
      throw new RegraNegocioPixError('Conta ou usuário vinculado inativo');
    }

    const solicitante = origem.usuarios.find(
      (vinculo) => vinculo.usuarioId === usuarioSolicitanteId,
    );
    if (solicitante?.papel !== PapelUsuarioConta.TITULAR) {
      throw new RegraNegocioPixError(
        'Solicitante não é mais titular da origem',
      );
    }

    const origemAtualizada = await tx.conta.update({
      where: { contaId: contaOrigemId },
      data: { saldo: { decrement: valor } },
    });
    if (origemAtualizada.saldo.lessThan(0)) {
      throw new RegraNegocioPixError('Saldo insuficiente');
    }

    await tx.conta.update({
      where: { contaId: contaDestinoId },
      data: { saldo: { increment: valor } },
    });
    const efetivada = await tx.transacaoPix.update({
      where: { transacaoId: pendente.transacaoId },
      data: {
        status: StatusTransacao.EFETIVADA,
        dataEfetivacao: new Date(),
      },
    });
    await tx.logAtividade.create({
      data: {
        acao: 'EXECUCAO_PIX_AGENDADO',
        usuarioId: usuarioSolicitanteId,
      },
    });

    return efetivada;
  }
}
