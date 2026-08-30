import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  private gerarNumeroContaUnico(): string {
    const numeroSemDigito = Math.floor(100000 + Math.random() * 900000);
    const digito = Math.floor(Math.random() * 10);
    return `${numeroSemDigito}-${digito}`;
  }

  async criarConta(dto: CreateContaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (usuario.status !== 'ATIVO') {
      throw new ForbiddenException('Usuários inativos não podem abrir contas bancárias.');
    }

    const agenciaGerada = '0001';
    let numeroContaGerado = this.gerarNumeroContaUnico();

    let contaExiste = await this.prisma.conta.findFirst({
      where: { agencia: agenciaGerada, numeroConta: numeroContaGerado },
    });

    while (contaExiste) {
      numeroContaGerado = this.gerarNumeroContaUnico();
      contaExiste = await this.prisma.conta.findFirst({
        where: { agencia: agenciaGerada, numeroConta: numeroContaGerado },
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const conta = await tx.conta.create({
        data: {
          agencia: agenciaGerada,
          numeroConta: numeroContaGerado,
          limiteDiarioPix: dto.limiteDiarioPix ?? 1000.0,
        },
      });

      await tx.usuarioConta.create({
        data: {
          usuarioId: dto.usuarioId,
          contaId: conta.contaId,
          papel: 'TITULAR',
        },
      });

      await tx.logAtividade.create({
        data: {
          usuarioId: dto.usuarioId,
          acao: 'CRIACAO DE CONTA',
        },
      });

      return conta;
    });
  }

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