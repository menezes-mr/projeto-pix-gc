import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async gerarRelatorioTransacoes(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (fim < inicio) {
      throw new BadRequestException(
        'dataFim não pode ser anterior a dataInicio',
      );
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

    const transacoes = await this.prisma.transacaoPix.findMany({
      where: {
        OR: [
          { dataEfetivacao: { gte: inicio, lte: fim } },
          { dataAgendamento: { gte: inicio, lte: fim } },
        ],
      },
      orderBy: { dataEfetivacao: 'desc' },
      take: 50,
      include: {
        contaOrigem: {
          include: {
            usuarios: {
              include: { usuario: true },
            },
          },
        },
        contaDestino: {
          include: {
            usuarios: {
              include: { usuario: true },
            },
          },
        },
      },
    });

    return {
      periodo: { dataInicio, dataFim },
      volumeTotalEfetivado,
      detalhamento,
      transacoes: transacoes.map((t) => ({
        transacaoId: t.transacaoId,
        valor: Number(t.valor),
        tipoOperacao: t.tipoOperacao,
        status: t.status,
        chavePixUtilizada: t.chavePixUtilizada,
        dataEfetivacao: t.dataEfetivacao,
        dataAgendamento: t.dataAgendamento,
        origemTitular:
          t.contaOrigem?.usuarios.find((u) => u.papel === 'TITULAR')?.usuario
            ?.nomeCompleto ||
          t.contaOrigem?.usuarios[0]?.usuario?.nomeCompleto ||
          'Origem Externa',
        destinoTitular:
          t.contaDestino?.usuarios.find((u) => u.papel === 'TITULAR')?.usuario
            ?.nomeCompleto ||
          t.contaDestino?.usuarios[0]?.usuario?.nomeCompleto ||
          'Destino Externo',
        contaOrigemId: t.contaOrigemId,
        contaDestinoId: t.contaDestinoId,
      })),
    };
  }

  async listarTodasContas() {
    const contas = await this.prisma.conta.findMany({
      orderBy: { dataCriacao: 'desc' },
      include: {
        usuarios: {
          include: { usuario: true },
        },
        chavesPix: {
          where: { status: 'ATIVA' },
        },
      },
    });

    return contas.map((conta) => {
      const usuarioTitular =
        conta.usuarios.find((u) => u.papel === 'TITULAR')?.usuario ??
        conta.usuarios[0]?.usuario;
      return {
        contaId: conta.contaId,
        numeroConta: conta.numeroConta,
        saldo: Number(conta.saldo),
        limiteDiarioPix: Number(conta.limiteDiarioPix),
        status: conta.status,
        dataCriacao: conta.dataCriacao,
        titular: usuarioTitular
          ? {
              nomeCompleto: usuarioTitular.nomeCompleto,
              cpfCnpj: usuarioTitular.cpfCnpj,
              email: usuarioTitular.email,
              usuarioId: usuarioTitular.usuarioId,
            }
          : null,
        totalChaves: conta.chavesPix.length,
      };
    });
  }
}
