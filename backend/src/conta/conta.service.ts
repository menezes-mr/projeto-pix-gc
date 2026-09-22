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
import { BloquearContaDto } from './dto/bloquear-conta.dto';

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

  async consultarSaldo(contaId: string, idUsuarioLogado: string) {
    const conta = await this.prisma.conta.findFirst({
      where: {
        contaId,
        status: StatusConta.ATIVA,
        usuarios: {
          some: {
            usuarioId: idUsuarioLogado,
            papel: PapelUsuarioConta.TITULAR,
          },
        },
      },
      include: {
        usuarios: {
          where: { usuarioId: idUsuarioLogado },
          include: { usuario: true },
        },
      },
    });

    if (!conta) {
      const contaExistente = await this.prisma.conta.findUnique({
        where: { contaId },
        include: {
          usuarios: {
            where: { usuarioId: idUsuarioLogado },
          },
        },
      });

      if (!contaExistente) {
        throw new NotFoundException('Conta bancária não encontrada.');
      }

      if (!contaExistente.usuarios.length) {
        throw new ForbiddenException('Acesso negado: Você não é o titular desta conta.');
      }

      throw new ForbiddenException('Apenas contas e usuários ativos podem consultar o saldo.');
    }

    const usuarioTitular = conta.usuarios[0]?.usuario;
    if (!usuarioTitular || usuarioTitular.status !== StatusUsuario.ATIVO) {
      throw new ForbiddenException('Apenas contas e usuários ativos podem consultar o saldo.');
    }

    this.prisma.logAtividade
      .create({
        data: {
          usuarioId: idUsuarioLogado,
          acao: 'CONSULTA_SALDO',
        },
      })
      .catch((error) => {
        console.error('Erro ao gravar LogAtividade em CONSULTA_SALDO:', error);
      });

    return {
      saldo: Number(conta.saldo),
      limiteDiarioPix: Number(conta.limiteDiarioPix),
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
  private ajustarFimDoDia(data: string): Date {
    if (data.includes('T')) {
      return new Date(data);
    }
    return new Date(`${data}T23:59:59.999Z`);
  }

  async listarTransacoes(
    contaId: string,
    usuarioIdLogado: string,
    page: number,
    limit: number,
    dataInicio?: string,
    dataFim?: string,
  ) {
    const conta = await this.prisma.conta.findUnique({ where: { contaId } });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status !== 'ATIVA') {
      throw new ForbiddenException('Conta não está ativa.');
    }

    const vinculo = await this.prisma.usuarioConta.findFirst({
      where: { contaId, usuarioId: usuarioIdLogado, papel: 'TITULAR' },
    });

    if (!vinculo) {
      throw new ForbiddenException('Você não tem permissão para acessar o extrato desta conta.');
    }

    const dataFiltro: { gte?: Date; lte?: Date } = {};
    if (dataInicio) {
      dataFiltro.gte = new Date(dataInicio);
    }
    if (dataFim) {
      dataFiltro.lte = this.ajustarFimDoDia(dataFim);
    }

    if (dataFiltro.gte && dataFiltro.lte && dataFiltro.lte < dataFiltro.gte) {
      throw new BadRequestException('dataFim não pode ser anterior a dataInicio.');
    }

    const skip = (page - 1) * limit;
    const where: any = {
      OR: [{ contaOrigemId: contaId }, { contaDestinoId: contaId }],
    };

    if (Object.keys(dataFiltro).length > 0) {
      where.AND = [{ dataEfetivacao: dataFiltro }];
    }

    const [transacoes, total] = await this.prisma.$transaction([
      this.prisma.transacaoPix.findMany({
        where,
        orderBy: { dataEfetivacao: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transacaoPix.count({ where }),
    ]);

    return {
      data: transacoes,
      meta: {
        paginaAtual: page,
        totalPaginas: Math.max(1, Math.ceil(total / limit)),
        totalRegistros: total,
        limite: limit,
      },
    };
  }

  async bloquearContaPorFraude(contaId: string, dto: BloquearContaDto) {
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status === StatusConta.INATIVA) {
      throw new BadRequestException(
        'Não é possível bloquear uma conta que já se encontra encerrada.',
      );
    }

    if (conta.status === StatusConta.BLOQUEADA) {
      throw new BadRequestException('Esta conta já se encontra bloqueada.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaBloqueada = await tx.conta.update({
        where: { contaId },
        data: {
          status: StatusConta.BLOQUEADA,
          dataAtualizacao: new Date(),
        },
      });

      const detalheMotivo = dto.motivo ? ` | Motivo: ${dto.motivo}` : '';

      await tx.logAtividade.create({
        data: {
          usuarioId: dto.usuarioId,
          acao: `BLOQUEIO_POR_FRAUDE${detalheMotivo}`,
        },
      });

      return {
        mensagem: 'Conta bloqueada por suspeita de fraude com sucesso.',
        conta: contaBloqueada,
      };
    });
  }
}