import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContatoPixDto } from './dto/create-contato-pix.dto';

@Injectable()
export class ContatosPixService {
  constructor(private readonly prisma: PrismaService) {}

  private async verificarTitularContaAtiva(
    usuarioId: string,
    contaId?: string,
  ) {
    if (contaId && this.prisma.usuarioConta?.findFirst) {
      const vinculo = await this.prisma.usuarioConta.findFirst({
        where: { usuarioId, contaId },
      });
      if (!vinculo || vinculo.papel !== 'TITULAR') {
        throw new ForbiddenException(
          'Apenas o titular da conta pode visualizar ou gerenciar contatos PIX.',
        );
      }
    }
  }

  async listar(usuarioId: string, contaId?: string) {
    await this.verificarTitularContaAtiva(usuarioId, contaId);
    const contatos = await this.prisma.contatoPix.findMany({
      where: { usuarioId },
      orderBy: { nomeContato: 'asc' },
    });

    if (!contatos.length || !this.prisma.chavePix?.findMany) {
      return contatos;
    }

    const valoresChaves = contatos.map((c) => c.chavePix);
    const chavesAtivas = await this.prisma.chavePix.findMany({
      where: {
        valorChave: { in: valoresChaves },
        status: 'ATIVA',
        conta: { status: 'ATIVA' },
      },
      select: { valorChave: true },
    });

    const conjuntoAtivas = new Set(chavesAtivas.map((k) => k.valorChave));
    return contatos.filter((c) => conjuntoAtivas.has(c.chavePix));
  }

  async criar(usuarioId: string, dto: CreateContatoPixDto, contaId?: string) {
    await this.verificarTitularContaAtiva(usuarioId, contaId);
    const contatoExistente = await this.prisma.contatoPix.findFirst({
      where: {
        usuarioId,
        chavePix: dto.chavePix,
      },
    });

    if (contatoExistente) {
      throw new ConflictException(
        'Esta chave PIX já está salva na sua agenda de contatos.',
      );
    }

    return this.prisma.contatoPix.create({
      data: {
        nomeContato: dto.nomeContato,
        chavePix: dto.chavePix,
        tipoChave: dto.tipoChave,
        usuarioId,
      },
    });
  }

  async remover(usuarioId: string, contatoId: string, contaId?: string) {
    await this.verificarTitularContaAtiva(usuarioId, contaId);
    const contato = await this.prisma.contatoPix.findUnique({
      where: { contatoId },
    });

    if (!contato) {
      throw new NotFoundException('Contato PIX não encontrado.');
    }

    if (contato.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para remover este contato.',
      );
    }

    await this.prisma.contatoPix.delete({
      where: { contatoId },
    });

    return { mensagem: 'Contato removido com sucesso.' };
  }
}
