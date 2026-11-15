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

  async listar(usuarioId: string) {
    return this.prisma.contatoPix.findMany({
      where: { usuarioId },
      orderBy: { nomeContato: 'asc' },
    });
  }

  async criar(usuarioId: string, dto: CreateContatoPixDto) {
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

  async remover(usuarioId: string, contatoId: string) {
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
