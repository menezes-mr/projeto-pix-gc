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
    // 1. Confere se a conta existe e busca o vínculo com o usuário junto,
    //    já trazendo o usuário para checar o status dele também.
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

    // 2. Garante que a conta pertence ao usuário informado
    const vinculo = conta.usuarios[0];
    if (!vinculo) {
      throw new ForbiddenException('Esta conta não pertence ao usuário informado');
    }

    // 3. Verificação de Ativos: conta 'ATIVA' e usuário 'ATIVO'
    if (conta.status !== 'ATIVA') {
      throw new BadRequestException('A conta não está ativa');
    }
    if (vinculo.usuario.status !== 'ATIVO') {
      throw new BadRequestException('O usuário não está ativo');
    }

    // 4. Gera a chave EVP (UUID v4) — nativo do Node, sem lib extra
    const valorChave = randomUUID();

    // 5. Persiste a chave e o log de atividade na mesma transação,
    //    pra nunca ter chave criada sem o respectivo log
    const [chave] = await this.prisma.$transaction([
      this.prisma.chavePix.create({
        data: {
          tipoChave: 'ALEATORIA',
          valorChave,
          status: 'ATIVA',
          contaId,
        },
      }),
      this.prisma.logAtividade.create({
        data: {
          acao: 'CRIACAO_DE_CHAVE_ALEATORIA',
          usuarioId,
        },
      }),
    ]);

    return chave;
  }
}