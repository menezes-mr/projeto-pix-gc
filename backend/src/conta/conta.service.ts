import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, type Conta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { AdicionarCotitularDto } from './dto/adicionar-cotitular.dto';
import {
  StatusUsuario,
  StatusConta,
  PapelUsuarioConta,
  StatusTransacao,
} from '../common/enums/status.enum';
import { BloquearContaDto } from './dto/bloquear-conta.dto';
import { DesbloquearContaDto } from './dto/desbloquear-conta.dto';

@Injectable()
export class ContaService {
  constructor(private readonly prisma: PrismaService) {}

  async verificarTitular(contaId: string, usuarioId: string) {
    const vinculo = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId,
        papel: PapelUsuarioConta.TITULAR,
        usuario: { status: StatusUsuario.ATIVO },
      },
    });
    if (!vinculo) {
      throw new ForbiddenException(
        'Acesso permitido apenas ao titular da conta.',
      );
    }
  }

  async verificarVinculo(contaId: string, usuarioId: string) {
    const vinculo = await this.prisma.usuarioConta.findFirst({
      where: { contaId, usuarioId, usuario: { status: StatusUsuario.ATIVO } },
    });
    if (!vinculo) throw new ForbiddenException('Acesso negado a esta conta.');
  }

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

    if (conta.status === String(StatusConta.BLOQUEADA)) {
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
        throw new ForbiddenException(
          'Acesso negado: Você não é o titular desta conta.',
        );
      }

      throw new ForbiddenException(
        'Apenas contas e usuários ativos podem consultar o saldo.',
      );
    }

    const usuarioTitular = conta.usuarios[0]?.usuario;
    if (
      !usuarioTitular ||
      usuarioTitular.status !== String(StatusUsuario.ATIVO)
    ) {
      throw new ForbiddenException(
        'Apenas contas e usuários ativos podem consultar o saldo.',
      );
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

    if (usuario.status === String(StatusUsuario.BLOQUEADO)) {
      throw new ForbiddenException(
        'Usuário bloqueado por segurança. Não é possível abrir novas contas bancárias.',
      );
    }

    if (usuario.status !== String(StatusUsuario.ATIVO)) {
      throw new ForbiddenException(
        'Apenas usuários com cadastro ativo podem abrir contas bancárias.',
      );
    }

    const agenciaGerada = '0001';
    let conta: Conta | null = null;
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
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2002'
        ) {
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

    if (conta.status !== String(StatusConta.ATIVA)) {
      throw new ForbiddenException(
        'Apenas contas ativas podem ter suas configurações alteradas.',
      );
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
        throw new ForbiddenException(
          'O usuário informado não é o titular desta conta.',
        );
      }

      if (vinculoUsuario.usuario.status === String(StatusUsuario.BLOQUEADO)) {
        throw new ForbiddenException(
          'O usuário titular está bloqueado no sistema por segurança.',
        );
      }

      if (vinculoUsuario.usuario.status !== String(StatusUsuario.ATIVO)) {
        throw new ForbiddenException(
          'O usuário titular precisa estar ativo para realizar alterações.',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaAtualizada = await tx.conta.update({
        where: { contaId },
        data: {
          ...(dto.limiteDiarioPix !== undefined && {
            limiteDiarioPix: dto.limiteDiarioPix,
          }),
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

    if (contaExistente.status === String(StatusConta.INATIVA)) {
      throw new BadRequestException(
        'Esta conta bancária já se encontra encerrada.',
      );
    }

    if (Number(contaExistente.saldo) !== 0) {
      throw new BadRequestException(
        'A conta possui saldo remanescente e não pode ser encerrada.',
      );
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
      where: { contaId, usuarioId: usuarioIdLogado },
    });

    if (!vinculo) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar o extrato desta conta.',
      );
    }

    const dataFiltro: { gte?: Date; lte?: Date } = {};
    if (dataInicio) {
      dataFiltro.gte = new Date(dataInicio);
    }
    if (dataFim) {
      dataFiltro.lte = this.ajustarFimDoDia(dataFim);
    }

    if (dataFiltro.gte && dataFiltro.lte && dataFiltro.lte < dataFiltro.gte) {
      throw new BadRequestException(
        'dataFim não pode ser anterior a dataInicio.',
      );
    }

    const skip = (page - 1) * limit;
    const where: Prisma.TransacaoPixWhereInput = {
      OR: [{ contaOrigemId: contaId }, { contaDestinoId: contaId }],
    };
    if (Object.keys(dataFiltro).length > 0) {
      where.AND = [
        {
          OR: [{ dataEfetivacao: dataFiltro }, { dataAgendamento: dataFiltro }],
        },
      ];
    }

    const [transacoes, total] = await this.prisma.$transaction([
      this.prisma.transacaoPix.findMany({
        where,
        include: {
          contaOrigem: {
            select: { contaId: true, agencia: true, numeroConta: true },
          },
          contaDestino: {
            select: { contaId: true, agencia: true, numeroConta: true },
          },
          usuarioSolicitante: {
            select: { usuarioId: true, nomeCompleto: true },
          },
        },
        orderBy: [
          { dataEfetivacao: { sort: 'desc', nulls: 'last' } },
          { dataAgendamento: 'desc' },
        ],
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
      include: {
        usuarios: true,
      },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status === String(StatusConta.INATIVA)) {
      throw new BadRequestException(
        'Não é possível bloquear uma conta que já se encontra encerrada.',
      );
    }

    if (conta.status === String(StatusConta.BLOQUEADA)) {
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

      for (const usuarioConta of conta.usuarios) {
        await tx.usuario.update({
          where: { usuarioId: usuarioConta.usuarioId },
          data: {
            status: StatusUsuario.BLOQUEADO,
            dataAtualizacao: new Date(),
          },
        });
      }

      await tx.transacaoPix.updateMany({
        where: {
          contaOrigemId: contaId,
          status: StatusTransacao.PENDENTE,
        },
        data: {
          status: StatusTransacao.CANCELADA,
        },
      });

      const detalheMotivo = dto.motivo ? ` | Motivo: ${dto.motivo}` : '';
      const usuarioValido = await tx.usuario.findUnique({
        where: { usuarioId: dto.usuarioId },
      });
      const idUsuarioParaLog =
        usuarioValido?.usuarioId ?? conta.usuarios[0]?.usuarioId;

      if (idUsuarioParaLog) {
        await tx.logAtividade.create({
          data: {
            usuarioId: idUsuarioParaLog,
            acao: `BLOQUEIO_POR_FRAUDE${detalheMotivo}`,
          },
        });
      }

      return {
        mensagem: 'Conta bloqueada por suspeita de fraude com sucesso.',
        conta: contaBloqueada,
      };
    });
  }

  async desbloquearConta(contaId: string, dto?: DesbloquearContaDto) {
    const conta = await this.prisma.conta.findUnique({
      where: { contaId },
      include: {
        usuarios: true,
      },
    });

    if (!conta) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    if (conta.status !== String(StatusConta.BLOQUEADA)) {
      throw new BadRequestException('Esta conta não se encontra bloqueada.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const contaDesbloqueada = await tx.conta.update({
        where: { contaId },
        data: {
          status: StatusConta.ATIVA,
          dataAtualizacao: new Date(),
        },
      });

      for (const usuarioConta of conta.usuarios) {
        await tx.usuario.update({
          where: { usuarioId: usuarioConta.usuarioId },
          data: {
            status: StatusUsuario.ATIVO,
            dataAtualizacao: new Date(),
          },
        });
      }

      const detalheMotivo = dto?.motivo ? ` | Motivo: ${dto.motivo}` : '';
      const usuarioValido = dto?.usuarioId
        ? await tx.usuario.findUnique({ where: { usuarioId: dto.usuarioId } })
        : null;
      const idUsuarioParaLog =
        usuarioValido?.usuarioId ?? conta.usuarios[0]?.usuarioId;

      if (idUsuarioParaLog) {
        await tx.logAtividade.create({
          data: {
            usuarioId: idUsuarioParaLog,
            acao: `DESBLOQUEIO_CONTA${detalheMotivo}`,
          },
        });
      }

      return {
        mensagem: 'Conta e usuários associados desbloqueados com sucesso.',
        conta: contaDesbloqueada,
      };
    });
  }

  async listarCotitulares(contaId: string) {
    await this.buscarContaPorId(contaId);

    return await this.prisma.usuarioConta.findMany({
      where: { contaId },
      include: {
        usuario: {
          select: {
            usuarioId: true,
            nomeCompleto: true,
            email: true,
            cpfCnpj: true,
            telefone: true,
            status: true,
          },
        },
      },
      orderBy: {
        papel: 'desc',
      },
    });
  }

  async adicionarCotitular(
    contaId: string,
    idUsuarioLogado: string,
    dto: AdicionarCotitularDto,
  ) {
    await this.buscarContaPorId(contaId);

    const vinculoSolicitante = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId: idUsuarioLogado,
        papel: PapelUsuarioConta.TITULAR,
      },
    });

    if (!vinculoSolicitante) {
      throw new ForbiddenException(
        'Apenas titulares da conta podem adicionar cotitulares.',
      );
    }

    const identificadorLimpo = dto.identificador.trim();
    const apenasDigitos = identificadorLimpo.replace(/\D/g, '');
    const candidatosCpf =
      apenasDigitos && apenasDigitos !== identificadorLimpo
        ? [identificadorLimpo, apenasDigitos]
        : [identificadorLimpo];

    const usuarioCotitular = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: identificadorLimpo }, { cpfCnpj: { in: candidatosCpf } }],
      },
    });

    if (!usuarioCotitular) {
      throw new NotFoundException(
        'Usuário não encontrado para o CPF/CNPJ ou e-mail informado.',
      );
    }

    if (usuarioCotitular.status !== String(StatusUsuario.ATIVO)) {
      throw new BadRequestException(
        'Apenas usuários com cadastro ativo podem ser adicionados como cotitulares.',
      );
    }

    const vinculoExistente = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId: usuarioCotitular.usuarioId,
      },
    });

    if (vinculoExistente) {
      throw new ConflictException(
        'Este usuário já está vinculado a esta conta.',
      );
    }

    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const chave = { contaId, usuarioId: usuarioCotitular.usuarioId };
    try {
      return await this.prisma.conviteCotitular.create({
        data: { ...chave, papel: dto.papel, expiraEm },
      });
    } catch (erro) {
      if (
        !(erro instanceof Prisma.PrismaClientKnownRequestError) ||
        erro.code !== 'P2002'
      )
        throw erro;
      const atualizado = await this.prisma.conviteCotitular.updateMany({
        where: {
          ...chave,
          OR: [{ status: { not: 'PENDENTE' } }, { expiraEm: { lte: agora } }],
        },
        data: {
          papel: dto.papel,
          status: 'PENDENTE',
          criadoEm: agora,
          expiraEm,
        },
      });
      if (atualizado.count !== 1)
        throw new ConflictException('Já existe um convite pendente.');
      return this.prisma.conviteCotitular.findUniqueOrThrow({
        where: { contaId_usuarioId: chave },
      });
    }
  }

  async listarConvitesRecebidos(usuarioId: string) {
    return this.prisma.conviteCotitular.findMany({
      where: { usuarioId, status: 'PENDENTE', expiraEm: { gt: new Date() } },
      include: { conta: { select: { agencia: true, numeroConta: true } } },
    });
  }

  async listarConvitesEnviados(contaId: string, usuarioId: string) {
    await this.verificarTitular(contaId, usuarioId);
    return this.prisma.conviteCotitular.findMany({
      where: { contaId },
      include: { usuario: { select: { nomeCompleto: true } } },
    });
  }

  async responderConvite(
    conviteId: string,
    usuarioId: string,
    aceitar: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const convite = await tx.conviteCotitular.findFirst({
        where: { conviteId, usuarioId },
      });
      if (!convite) throw new NotFoundException('Convite não encontrado.');
      if (convite.status !== 'PENDENTE' || convite.expiraEm <= new Date())
        throw new BadRequestException('Convite expirado ou já respondido.');
      if (aceitar) {
        const conta = await tx.conta.findUnique({
          where: { contaId: convite.contaId },
        });
        if (!conta || conta.status !== 'ATIVA')
          throw new BadRequestException('Conta indisponível.');
      }
      const atualizado = await tx.conviteCotitular.updateMany({
        where: {
          conviteId,
          usuarioId,
          status: 'PENDENTE',
          expiraEm: { gt: new Date() },
        },
        data: { status: aceitar ? 'ACEITO' : 'RECUSADO' },
      });
      if (atualizado.count !== 1)
        throw new ConflictException('Convite já respondido ou expirado.');
      if (aceitar)
        await tx.usuarioConta.create({
          data: { contaId: convite.contaId, usuarioId, papel: convite.papel },
        });
      return { status: aceitar ? 'ACEITO' : 'RECUSADO' };
    });
  }

  async removerCotitular(
    contaId: string,
    idUsuarioLogado: string,
    idUsuarioRemover: string,
  ) {
    await this.buscarContaPorId(contaId);

    const vinculoSolicitante = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId: idUsuarioLogado,
        papel: PapelUsuarioConta.TITULAR,
      },
    });

    if (!vinculoSolicitante) {
      throw new ForbiddenException(
        'Apenas titulares da conta podem remover cotitulares.',
      );
    }

    const vinculoRemover = await this.prisma.usuarioConta.findFirst({
      where: {
        contaId,
        usuarioId: idUsuarioRemover,
      },
      include: {
        usuario: true,
      },
    });

    if (!vinculoRemover) {
      throw new NotFoundException(
        'O usuário informado não está vinculado a esta conta.',
      );
    }

    if (vinculoRemover.papel === String(PapelUsuarioConta.TITULAR)) {
      const titularesAtivos = await this.prisma.usuarioConta.count({
        where: {
          contaId,
          papel: PapelUsuarioConta.TITULAR,
          usuario: {
            status: StatusUsuario.ATIVO,
          },
        },
      });

      if (titularesAtivos <= 1) {
        throw new BadRequestException(
          'Não é possível remover o único titular ativo da conta.',
        );
      }
    }

    await this.prisma.usuarioConta.delete({
      where: {
        usuarioId_contaId: {
          usuarioId: idUsuarioRemover,
          contaId,
        },
      },
    });

    if (this.prisma.logAtividade?.create) {
      await this.prisma.logAtividade
        .create({
          data: {
            usuarioId: idUsuarioLogado,
            acao: `REMOCAO_COTITULAR: ${vinculoRemover.usuario?.nomeCompleto ?? idUsuarioRemover}`,
          },
        })
        .catch(() => undefined);
    }

    return {
      mensagem: 'Cotitular desvinculado da conta com sucesso.',
    };
  }
}
