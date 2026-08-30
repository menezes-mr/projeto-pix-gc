import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';


import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async generateRandomKey(contaId: string, usuarioId: string) {
   
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
      include: {
        usuarios: {
          where: { usuarioId },
          include: { usuario: true },
        },
      },
    });

    if (!conta) {
      throw new NotFoundException('Conta não encontrada');
    }
    const vinculo = conta.usuarios[0];
    if (!vinculo) {
      throw new ForbiddenException('Esta conta não pertence ao usuário informado');
    }
    if (conta.status !== 'ATIVA') {
      throw new BadRequestException('A conta não está ativa');
    }
    if (vinculo.usuario.status !== 'ATIVO') {
      throw new BadRequestException('O usuário não está ativo');
    }
    const date = new Date();
    const valorChave = randomUUID();
    const [chave] = await this.prisma.$transaction([
      this.prisma.chavePix.create({
        data: {
          tipoChave: 'ALEATORIA',
          valorChave,
          status: 'ATIVA',
          dataCriacao: date,
          contaId,
        },
      }),
      this.prisma.logAtividade.create({
        data: {
          acao: 'CRIACAO DE CHAVE ALEATORIA',
          usuarioId,
          dataCriacao: date,
        },
      }),
    ]);

    return chave;
  }
}