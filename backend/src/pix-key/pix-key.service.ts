import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateChavePixDto } from './dto/create-chave-pix.dto';


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
        },
      }),
    ]);

    return chave;
  }

  async associarChavePix(dto: CreateChavePixDto) {
    const { tipoChave, valorChave, contaId, usuarioId } = dto;

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

    if (conta.status !== 'ATIVA' || vinculo.usuario.status !== 'ATIVO') {
      throw new BadRequestException('A conta e o usuário precisam estar ativos');
    }

    if ((tipoChave === 'CPF' || tipoChave === 'CNPJ') && valorChave !== vinculo.usuario.cpfCnpj) {
      throw new BadRequestException(`O valor fornecido não corresponde ao ${tipoChave} cadastrado para o usuário.`);
    }

    if (tipoChave === 'EMAIL' && valorChave !== vinculo.usuario.email) {
      throw new BadRequestException('O valor fornecido não corresponde ao EMAIL cadastrado para o usuário.');
    }

    const chaveExistente = await this.prisma.chavePix.findUnique({
      where: { valorChave },
    });

    if (chaveExistente) {
      throw new ConflictException('Esta chave PIX já está cadastrada no sistema.');
    }

    const [novaChave] = await this.prisma.$transaction([
      this.prisma.chavePix.create({
        data: {
          tipoChave,
          valorChave,
          status: 'ATIVA',
          contaId,
        },
      }),
      this.prisma.logAtividade.create({
        data: {
          acao: 'CRIACAO DE CHAVE PIX',
          usuarioId,
        },
      }),
    ]);

    return novaChave;
  }
}