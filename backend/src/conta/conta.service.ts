import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  async encerrarConta(contaId: string) {
    const conta = await this.prisma.conta.findFirst({
      where: {
        contaId,
        status: 'ATIVA',
      },
      include: {
        usuarios: true, 
      },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária ativa não encontrada.');
    }

    if (Number(conta.saldo) !== 0) {
      throw new BadRequestException('A conta possui saldo e não pode ser encerrada.');
    }

    const usuarioId = conta.usuarios[0]?.usuarioId;

    await this.prisma.$transaction(async (tx) => {
      await tx.conta.update({
        where: { contaId },
        data: {
          status: 'INATIVA',
          dataAtualizacao: new Date(),
        },
      });

      if (usuarioId) {
        await tx.logAtividade.create({
          data: {
            usuarioId,
            acao: 'ENCERRAMENTO DE CONTA',
          },
        });
      }
    });

    return { mensagem: 'Conta bancária encerrada com sucesso.' };
  }
}