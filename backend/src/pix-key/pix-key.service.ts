import { Injectable, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async generateRandomKey(contaId: string) {
    // 1. Gera a chave EVP (UUID v4) — crypto.randomUUID já vem no Node, não precisa de lib extra
    const valorChave = randomUUID();

    // 2. Confere se a conta existe antes de vincular a chave
    const conta = await this.prisma.conta.findUnique({ where: { contaId } });
    if (!conta) {
      throw new ConflictException('Conta não encontrada');
    }

    // 3. Persiste a chave vinculada à conta
    // valorChave é @unique no schema, então uma colisão de UUID
    // (praticamente impossível, mas...) vira erro do Prisma, não passa despercebido
    return this.prisma.chavePix.create({
      data: {
        tipoChave: 'EVP',
        valorChave,
        contaId,
      },
    });
  }
}