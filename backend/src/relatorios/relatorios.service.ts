import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async gerarRelatorioTransacoes(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (fim < inicio) {
      throw new BadRequestException('dataFim não pode ser anterior a dataInicio');
    }

    const relatorioBruto = await this.prisma.transacaoPix.groupBy({
      by: ['status', 'tipoOperacao'],
      _sum: { valor: true },
      _count: { transacaoId: true },
      where: {
        OR: [
          { dataEfetivacao: { gte: inicio, lte: fim } },
          { dataAgendamento: { gte: inicio, lte: fim } },
        ],
      },
    });

    const detalhamento = relatorioBruto.map((grupo) => ({
      status: grupo.status,
      tipoOperacao: grupo.tipoOperacao,
      valorTotal: Number(grupo._sum.valor ?? 0),
      quantidade: grupo._count.transacaoId,
    }));

    const volumeTotalEfetivado = detalhamento
      .filter((item) => item.status === 'EFETIVADA')
      .reduce((soma, item) => soma + item.valorTotal, 0);

    return {
      periodo: { dataInicio, dataFim },
      volumeTotalEfetivado,
      detalhamento,
    };
  }
}