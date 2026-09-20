import { Prisma } from '@prisma/client';
import { StatusTransacao } from '../../../common/enums/status.enum';
import { TipoOperacao } from '../../../common/enums/tipo-operacao.enum';

export interface CriarHistoricoDto {
  valor: Prisma.Decimal | number;
  tipoOperacao: TipoOperacao;
  status: StatusTransacao;
  contaOrigemId: string;
  contaDestinoId?: string;
  chavePixUtilizada?: string;
  dataAgendamento?: Date;
}
