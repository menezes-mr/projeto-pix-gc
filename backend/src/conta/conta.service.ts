import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateContaDto } from './dto/update-conta.dto';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  async atualizarConfiguracoes(contaId: string, dto: UpdateContaDto) {
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status !== 'ATIVA') {
      throw new ForbiddenException('Apenas contas com status ATIVA podem ser alteradas.');
    }

    const vinculoUsuario = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId: dto.usuarioId,
        papel: 'TITULAR',
      },
      include: {
        usuario: true,
      },
    });

    if (!vinculoUsuario || vinculoUsuario.usuario.status !== 'ATIVO') {
      throw new ForbiddenException(
        'Usuário não encontrado, não é o titular desta conta ou está INATIVO.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaAtualizada = await tx.conta.update({
        where: { contaId },
        data: {
          ...(dto.limiteDiarioPix !== undefined && { limiteDiarioPix: dto.limiteDiarioPix }),
          dataAtualizacao: new Date(),
        },
      });

      await tx.logAtividade.create({
        data: {
          usuarioId: dto.usuarioId,
          acao: 'ATUALIZACAO DE CONTA',
        },
      });

      return contaAtualizada;
    });
  }
}