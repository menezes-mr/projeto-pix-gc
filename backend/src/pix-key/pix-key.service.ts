import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateChavePixDto } from './dto/create-chave-pix.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixKeyService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarContaUsuario(contaId: string, usuarioId: string) {
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
      include: {
        usuarios: {
          where: { usuarioId },
          include: { usuario: true },
        },
      },
    });

    if (!conta) throw new NotFoundException('Conta não encontrada');
    
    const vinculo = conta.usuarios[0];
    if (!vinculo) throw new ForbiddenException('Esta conta não pertence ao usuário informado');
    
    if (conta.status !== 'ATIVA' || vinculo.usuario.status !== 'ATIVO') {
      throw new BadRequestException('A conta e o usuário precisam estar ativos');
    }

    return { conta, usuario: vinculo.usuario };
  }

  private mascararDocumento(doc: string) {
    if (doc.length === 11) return `***.${doc.substring(3, 6)}.${doc.substring(6, 9)}-**`;
    if (doc.length === 14) return `**.${doc.substring(2, 5)}.${doc.substring(5, 8)}/****-**`;
    return doc;
  }

  async generateRandomKey(contaId: string, usuarioId: string) {
    await this.validarContaUsuario(contaId, usuarioId);

    const [chave] = await this.prisma.$transaction([
      this.prisma.chavePix.create({
        data: {
          tipoChave: 'ALEATORIA',
          valorChave: randomUUID(),
          status: 'ATIVA',
          dataCriacao: new Date(),
          contaId,
        },
      }),
      this.prisma.logAtividade.create({
        data: { acao: 'CRIACAO DE CHAVE ALEATORIA', usuarioId },
      }),
    ]);

    return chave;
  }

  async associarChavePix(dto: CreateChavePixDto) {
    const { tipoChave, valorChave, contaId, usuarioId } = dto;
    const { usuario } = await this.validarContaUsuario(contaId, usuarioId);

    if ((tipoChave === 'CPF' || tipoChave === 'CNPJ') && valorChave !== usuario.cpfCnpj) {
      throw new BadRequestException(`O valor fornecido não corresponde ao ${tipoChave} cadastrado para o usuário.`);
    }

    if (tipoChave === 'EMAIL' && valorChave !== usuario.email) {
      throw new BadRequestException('O valor fornecido não corresponde ao EMAIL cadastrado para o usuário.');
    }

    const chaveExistente = await this.prisma.chavePix.findUnique({ where: { valorChave } });
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
        data: { acao: 'CRIACAO DE CHAVE PIX', usuarioId },
      }),
    ]);

    return novaChave;
  }

  async validarChavePix(valorChave: string) {
    const chave = await this.prisma.chavePix.findUnique({
      where: { valorChave },
      include: {
        conta: {
          include: {
            usuarios: {
              include: { usuario: true },
            },
          },
        },
      },
    });

    if (!chave || chave.status !== 'ATIVA' || chave.conta.status !== 'ATIVA' || !chave.conta.usuarios[0] || chave.conta.usuarios[0].usuario.status !== 'ATIVO') {
      throw new NotFoundException('Chave PIX inválida ou inexistente');
    }

    const usuario = chave.conta.usuarios[0].usuario;

    return {
      chavePix: chave.valorChave,
      tipoChave: chave.tipoChave,
      nomeCompleto: usuario.nomeCompleto,
      documentoMascarado: this.mascararDocumento(usuario.cpfCnpj),
    };
  }
}