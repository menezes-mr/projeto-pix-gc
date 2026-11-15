import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatorioTransacoesService {
  constructor(private readonly prisma: PrismaService) {}

  private ajustarFimDoDia(data: string): Date {
    if (data.includes('T')) {
      return new Date(data);
    }
    return new Date(`${data}T23:59:59.999Z`);
  }

  async gerar(
    usuarioIdRota: string,
    usuarioIdLogado: string,
    dataInicio?: string,
    dataFim?: string,
  ) {
    if (usuarioIdRota !== usuarioIdLogado) {
      throw new ForbiddenException(
        'Você só pode gerar o relatório do seu próprio usuário',
      );
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { usuarioId: usuarioIdRota, status: 'ATIVO' },
      include: { contas: { select: { contaId: true } } },
    });

    if (!usuario) {
      throw new ForbiddenException('Usuário não encontrado ou inativo');
    }

    const dataFiltro: { gte?: Date; lte?: Date } = {};
    if (dataInicio) {
      dataFiltro.gte = new Date(dataInicio);
    }
    if (dataFim) {
      dataFiltro.lte = this.ajustarFimDoDia(dataFim);
    }

    if (dataFiltro.gte && dataFiltro.lte && dataFiltro.lte < dataFiltro.gte) {
      throw new BadRequestException(
        'dataFim não pode ser anterior a dataInicio.',
      );
    }

    const contaIds = usuario.contas.map((vinculo) => vinculo.contaId);
    const filtroPeriodo: Prisma.TransacaoPixWhereInput =
      Object.keys(dataFiltro).length > 0
        ? {
            OR: [
              { dataEfetivacao: dataFiltro },
              { dataAgendamento: dataFiltro },
            ],
          }
        : {};

    const whereSaidas: Prisma.TransacaoPixWhereInput = {
      contaOrigemId: { in: contaIds },
      status: 'EFETIVADA',
      ...filtroPeriodo,
    };

    const whereEntradas: Prisma.TransacaoPixWhereInput = {
      contaDestinoId: { in: contaIds },
      status: 'EFETIVADA',
      ...filtroPeriodo,
    };

    const whereConsolidado: Prisma.TransacaoPixWhereInput = {
      OR: [
        { contaOrigemId: { in: contaIds } },
        { contaDestinoId: { in: contaIds } },
      ],
      ...(Object.keys(filtroPeriodo).length > 0
        ? { AND: [filtroPeriodo] }
        : {}),
    };

    const [saidas, entradas, quantidadeTransacoes, transacoes] =
      await Promise.all([
        this.prisma.transacaoPix.aggregate({
          _sum: { valor: true },
          where: whereSaidas,
        }),
        this.prisma.transacaoPix.aggregate({
          _sum: { valor: true },
          where: whereEntradas,
        }),
        this.prisma.transacaoPix.count({
          where: {
            ...whereConsolidado,
            status: 'EFETIVADA',
          },
        }),
        this.prisma.transacaoPix.findMany({
          where: whereConsolidado,
          include: {
            contaOrigem: {
              select: { contaId: true, agencia: true, numeroConta: true },
            },
            contaDestino: {
              select: { contaId: true, agencia: true, numeroConta: true },
            },
            usuarioSolicitante: {
              select: { usuarioId: true, nomeCompleto: true },
            },
          },
          orderBy: [
            { dataEfetivacao: { sort: 'desc', nulls: 'last' } },
            { dataAgendamento: 'desc' },
          ],
        }),
      ]);

    const zero = new Prisma.Decimal(0);
    const totalEnviado = saidas._sum.valor ?? zero;
    const totalRecebido = entradas._sum.valor ?? zero;

    return {
      usuarioId: usuario.usuarioId,
      periodo: {
        dataInicio: dataInicio ?? null,
        dataFim: dataFim ?? null,
      },
      resumo: {
        totalEnviado: totalEnviado.toNumber(),
        totalRecebido: totalRecebido.toNumber(),
        totalEntradas: totalRecebido.toNumber(),
        totalSaidas: totalEnviado.toNumber(),
        balancoPeriodo: totalRecebido.minus(totalEnviado).toNumber(),
        quantidadeTransacoes,
      },
      transacoes: transacoes.map((t) => ({
        transacaoId: t.transacaoId,
        valor: Number(t.valor),
        tipoOperacao: t.tipoOperacao,
        direcao: contaIds.includes(t.contaOrigemId ?? '') ? 'SAIDA' : 'ENTRADA',
        status: t.status,
        chavePixUtilizada: t.chavePixUtilizada,
        dataEfetivacao: t.dataEfetivacao,
        dataAgendamento: t.dataAgendamento,
        contaOrigemId: t.contaOrigemId,
        contaDestinoId: t.contaDestinoId,
        contaOrigem: t.contaOrigem,
        contaDestino: t.contaDestino,
        usuarioSolicitante: t.usuarioSolicitante,
      })),
    };
  }
}
