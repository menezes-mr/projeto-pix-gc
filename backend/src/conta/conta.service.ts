import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { StatusUsuario, StatusConta, PapelUsuarioConta } from '../common/enums/status.enum';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  private gerarNumeroContaUnico(): string {
    const numeroSemDigito = Math.floor(100000 + Math.random() * 900000);
    const digito = Math.floor(Math.random() * 10);
    return `${numeroSemDigito}-${digito}`;
  }

  async buscarContaPorId(contaId: string) {
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status === StatusConta.BLOQUEADA) {
      throw new ForbiddenException(
        'Operação não permitida: Conta bloqueada por suspeita de fraude',
      );
    }

    return conta;
  }

  async consultarSaldo(contaId: string) {
    const conta = await this.buscarContaPorId(contaId);

    if (conta.status !== StatusConta.ATIVA) {
      throw new ForbiddenException('Apenas contas ativas podem consultar o saldo.');
    }

    return {
      contaId: conta.contaId,
      saldo: conta.saldo,
      limiteDiarioPix: conta.limiteDiarioPix,
    };
  }

  async criarConta(dto: CreateContaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (usuario.status === StatusUsuario.BLOQUEADO) {
      throw new ForbiddenException(
        'Usuário bloqueado por segurança. Não é possível abrir novas contas bancárias.',
      );
    }

    if (usuario.status !== StatusUsuario.ATIVO) {
      throw new ForbiddenException('Apenas usuários com cadastro ativo podem abrir contas bancárias.');
    }

    const agenciaGerada = '0001';
    let conta;
    let tentativas = 0;
    const maxTentativas = 5;

    while (tentativas < maxTentativas) {
      const numeroContaGerado = this.gerarNumeroContaUnico();
      try {
        conta = await this.prisma.$transaction(async (tx) => {
          const novaConta = await tx.conta.create({
            data: {
              agencia: agenciaGerada,
              numeroConta: numeroContaGerado,
              limiteDiarioPix: dto.limiteDiarioPix ?? 1000.0,
              status: StatusConta.ATIVA,
            },
          });

          await tx.usuarioConta.create({
            data: {
              usuarioId: dto.usuarioId,
              contaId: novaConta.contaId,
              papel: PapelUsuarioConta.TITULAR,
            },
          });

          await tx.logAtividade.create({
            data: {
              usuarioId: dto.usuarioId,
              acao: 'CRIACAO DE CONTA',
            },
          });

          return novaConta;
        });
        break;
      } catch (error: any) {
        if (error.code === 'P2002') {
          tentativas++;
          continue;
        }
        throw error;
      }
    }

    if (!conta) {
      throw new InternalServerErrorException(
        'Não foi possível gerar um número de conta único após várias tentativas.',
      );
    }

    return conta;
  }

  async atualizarConfiguracoes(contaId: string, dto: UpdateContaDto) {
    const conta = await this.buscarContaPorId(contaId);

    if (conta.status !== StatusConta.ATIVA) {
      throw new ForbiddenException('Apenas contas ativas podem ter suas configurações alteradas.');
    }

    if (dto.usuarioId) {
      const vinculoUsuario = await this.prisma.usuarioConta.findFirst({
        where: {
          contaId,
          usuarioId: dto.usuarioId,
          papel: PapelUsuarioConta.TITULAR,
        },
        include: {
          usuario: true,
        },
      });

      if (!vinculoUsuario) {
        throw new ForbiddenException('O usuário informado não é o titular desta conta.');
      }

      if (vinculoUsuario.usuario.status === StatusUsuario.BLOQUEADO) {
        throw new ForbiddenException('O usuário titular está bloqueado no sistema por segurança.');
      }

      if (vinculoUsuario.usuario.status !== StatusUsuario.ATIVO) {
        throw new ForbiddenException('O usuário titular precisa estar ativo para realizar alterações.');
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaAtualizada = await tx.conta.update({
        where: { contaId },
        data: {
          ...(dto.limiteDiarioPix !== undefined && { limiteDiarioPix: dto.limiteDiarioPix }),
        },
      });

      if (dto.usuarioId) {
        await tx.logAtividade.create({
          data: {
            usuarioId: dto.usuarioId,
            acao: 'ATUALIZACAO DE CONTA',
          },
        });
      }

      return contaAtualizada;
    });
  }

  async encerrarConta(contaId: string, usuarioId?: string) {
    const contaExistente = await this.buscarContaPorId(contaId);

    if (contaExistente.status === StatusConta.INATIVA) {
      throw new BadRequestException('Esta conta bancária já se encontra encerrada.');
    }

    if (Number(contaExistente.saldo) !== 0) {
      throw new BadRequestException('A conta possui saldo remanescente e não pode ser encerrada.');
    }

    const contaComUsuarios = await this.prisma.conta.findUnique({
      where: { contaId },
      include: {
        usuarios: {
          where: { papel: PapelUsuarioConta.TITULAR },
        },
      },
    });

    const idUsuarioLog = usuarioId ?? contaComUsuarios?.usuarios[0]?.usuarioId;

    await this.prisma.$transaction(async (tx) => {
      await tx.conta.update({
        where: { contaId },
        data: {
          status: StatusConta.INATIVA,
          dataAtualizacao: new Date(),
        },
      });

      if (idUsuarioLog) {
        await tx.logAtividade.create({
          data: {
            usuarioId: idUsuarioLog,
            acao: 'ENCERRAMENTO DE CONTA',
          },
        });
      }
    });

    return { mensagem: 'Conta bancária encerrada com sucesso.' };
  }
}