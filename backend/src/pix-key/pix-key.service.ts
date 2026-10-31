import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateChavePixDto, TipoChavePix } from './dto/create-chave-pix.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PixKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async listarChavesDaConta(contaId: string) {
    return this.prisma.chavePix.findMany({
      where: { contaId, status: 'ATIVA' },
      orderBy: { dataCriacao: 'desc' },
    });
  }

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
    if (!vinculo)
      throw new ForbiddenException(
        'Esta conta não pertence ao usuário informado',
      );

    if (conta.status !== 'ATIVA' || vinculo.usuario.status !== 'ATIVO') {
      throw new BadRequestException(
        'A conta e o usuário precisam estar ativos',
      );
    }

    return { conta, usuario: vinculo.usuario };
  }

  private mascararDocumento(doc: string) {
    if (doc.length === 11)
      return `***.${doc.substring(3, 6)}.${doc.substring(6, 9)}-**`;
    if (doc.length === 14)
      return `**.${doc.substring(2, 5)}.${doc.substring(5, 8)}/****-**`;
    return doc;
  }

  async generateRandomKey(contaId: string, usuarioId: string) {
    await this.validarContaUsuario(contaId, usuarioId);

    const totalChaves = await this.prisma.chavePix.count({
      where: { contaId, status: 'ATIVA' },
    });
    if (totalChaves >= 5) {
      throw new BadRequestException(
        'Limite máximo de 5 chaves PIX ativas por conta atingido.',
      );
    }

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
    if (!contaId || !usuarioId) {
      throw new BadRequestException('Conta e usuário são obrigatórios');
    }

    const { usuario } = await this.validarContaUsuario(contaId, usuarioId);

    const totalChaves = await this.prisma.chavePix.count({
      where: { contaId, status: 'ATIVA' },
    });
    if (totalChaves >= 5) {
      throw new BadRequestException(
        'Limite máximo de 5 chaves PIX ativas por conta atingido.',
      );
    }

    if (
      (tipoChave === TipoChavePix.CPF || tipoChave === TipoChavePix.CNPJ) &&
      valorChave.replace(/\D/g, '') !== usuario.cpfCnpj.replace(/\D/g, '')
    ) {
      throw new BadRequestException(
        `O valor fornecido não corresponde ao ${tipoChave} cadastrado para o usuário.`,
      );
    }

    if (
      tipoChave === TipoChavePix.EMAIL &&
      valorChave.trim().toLowerCase() !== usuario.email.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        'O valor fornecido não corresponde ao EMAIL cadastrado para o usuário.',
      );
    }

    const chaveExistente = await this.prisma.chavePix.findUnique({
      where: { valorChave },
    });
    if (chaveExistente) {
      if (
        chaveExistente.status === 'INATIVA' &&
        chaveExistente.contaId === contaId
      ) {
        const [chaveReativada] = await this.prisma.$transaction([
          this.prisma.chavePix.update({
            where: { chaveId: chaveExistente.chaveId },
            data: { status: 'ATIVA', dataCriacao: new Date() },
          }),
          this.prisma.logAtividade.create({
            data: { acao: 'REATIVACAO DE CHAVE PIX', usuarioId },
          }),
        ]);
        return chaveReativada;
      }
      throw new ConflictException(
        'Esta chave PIX já está cadastrada no sistema.',
      );
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

  async inativarChavePix(id: string, contaId: string, usuarioId: string) {
    await this.validarContaUsuario(contaId, usuarioId);

    let chave = await this.prisma.chavePix.findUnique({
      where: { chaveId: id },
    });
    if (!chave) {
      chave = await this.prisma.chavePix.findUnique({
        where: { valorChave: id },
      });
    }

    if (!chave || chave.contaId !== contaId) {
      throw new NotFoundException('Chave PIX não encontrada para esta conta.');
    }

    if (chave.status === 'INATIVA') {
      throw new BadRequestException('Chave PIX já se encontra inativa.');
    }

    const [chaveAtualizada] = await this.prisma.$transaction([
      this.prisma.chavePix.update({
        where: { chaveId: chave.chaveId },
        data: { status: 'INATIVA' },
      }),
      this.prisma.logAtividade.create({
        data: {
          acao: `INATIVACAO DE CHAVE PIX: ${chave.tipoChave}`,
          usuarioId,
        },
      }),
    ]);

    return {
      mensagem: 'Chave PIX inativada com sucesso.',
      chave: chaveAtualizada,
    };
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

    if (
      !chave ||
      chave.status !== 'ATIVA' ||
      chave.conta.status !== 'ATIVA' ||
      !chave.conta.usuarios[0] ||
      chave.conta.usuarios[0].usuario.status !== 'ATIVO'
    ) {
      throw new NotFoundException('Chave PIX inválida ou inexistente');
    }

    const usuario = chave.conta.usuarios[0].usuario;

    return {
      chavePix: chave.valorChave,
      tipoChave: chave.tipoChave,
      nomeCompleto: usuario.nomeCompleto,
      documentoMascarado: this.mascararDocumento(usuario.cpfCnpj),
      contaId: chave.contaId,
    };
  }
}
