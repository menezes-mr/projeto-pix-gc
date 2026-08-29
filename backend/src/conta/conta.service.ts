import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { CreateContaDto } from './dto/create-conta.dto';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  async criarConta(dto: CreateContaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: dto.usuarioId },
      select: { status: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (usuario.status !== 'ATIVO') {
      throw new ForbiddenException('Usuário inativo não pode abrir contas.');
    }

    const contaExistente = await this.prisma.conta.findUnique({
      where: { numeroConta: dto.numeroConta },
    });

    if (contaExistente) {
      throw new ConflictException('O número de conta informado já está em uso.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaCriada = await tx.conta.create({
        data: {
          agencia: dto.agencia,
          numeroConta: dto.numeroConta,
          limiteDiarioPix: dto.limiteDiarioPix ?? 1000.00,
          saldo: 0.00,
          status: 'ATIVA',
          dataAtualizacao: new Date(),
        },
      });

      await tx.usuarioConta.create({
        data: {
          usuarioId: dto.usuarioId,
          contaId: contaCriada.contaId,
          papel: 'TITULAR',
        },
      });

      await tx.logAtividade.create({
        data: {
          usuarioId: dto.usuarioId,
          acao: 'CRIACAO DE CONTA',
        },
      });

      return contaCriada;
    });
  }
}