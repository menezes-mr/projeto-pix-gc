import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatorioTransacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async gerar(usuarioIdRota: string, usuarioIdLogado: string) {
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

    const contaIds = usuario.contas.map((vinculo) => vinculo.contaId);

    const [saidas, entradas, quantidadeTransacoes] = await Promise.all([
      this.prisma.transacaoPix.aggregate({
        _sum: { valor: true },
        where: { contaOrigemId: { in: contaIds }, status: 'EFETIVADA' },
      }),
      this.prisma.transacaoPix.aggregate({
        _sum: { valor: true },
        where: { contaDestinoId: { in: contaIds }, status: 'EFETIVADA' },
      }),
      this.prisma.transacaoPix.count({
        where: {
          status: 'EFETIVADA',
          OR: [
            { contaOrigemId: { in: contaIds } },
            { contaDestinoId: { in: contaIds } },
          ],
        },
      }),
    ]);

    const zero = new Prisma.Decimal(0);
    const totalEnviado = saidas._sum.valor ?? zero;
    const totalRecebido = entradas._sum.valor ?? zero;

    return {
      usuarioId: usuario.usuarioId,
      resumo: {
        totalEnviado: totalEnviado.toNumber(),
        totalRecebido: totalRecebido.toNumber(),
        balancoPeriodo: totalRecebido.minus(totalEnviado).toNumber(),
        quantidadeTransacoes,
      },
    };
  }
}
