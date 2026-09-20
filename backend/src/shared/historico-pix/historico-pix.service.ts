import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StatusTransacao } from '../../common/enums/status.enum';
import { CriarHistoricoDto } from './dto/criar-historico.dto';

@Injectable()
export class HistoricoPixService {
  async registrarTransacao(
    dados: CriarHistoricoDto,
    tx: Prisma.TransactionClient,
  ) {
    const dataEfetivacao =
      dados.status === StatusTransacao.EFETIVADA ? new Date() : null;

    return await tx.transacaoPix.create({
      data: {
        ...dados,
        dataEfetivacao,
      },
    });
  }
}
