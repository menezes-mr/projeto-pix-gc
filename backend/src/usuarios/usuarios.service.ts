import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { nomeCompleto, email, cpfCnpj, telefone, senha } = createUsuarioDto;

    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email }, { cpfCnpj }],
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'CPF/CNPJ ou Email já cadastrados no sistema',
      );
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const novoUsuario = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nomeCompleto,
          email,
          cpfCnpj,
          telefone,
          senha: senhaHash,
          status: 'ATIVO',
        },
      });

      await tx.logAtividade.create({
        data: {
          acao: 'CRIACAO DE USUARIO',
          usuarioId: usuario.usuarioId,
        },
      });

      return usuario;
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    return usuarioSemSenha;
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const usuarioExiste = await this.prisma.usuario.findFirst({
      where: {
        usuarioId: id,
        status: 'ATIVO',
      },
    });

    if (!usuarioExiste) {
      throw new NotFoundException('Usuário não encontrado ou inativo');
    }

    if (updateUsuarioDto.email) {
      const emailEmUso = await this.prisma.usuario.findFirst({
        where: {
          email: updateUsuarioDto.email,
          usuarioId: { not: id },
        },
      });

      if (emailEmUso) {
        throw new ConflictException(
          'O e-mail informado já está em uso por outro usuário',
        );
      }
    }

    const usuarioAtualizado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.update({
        where: { usuarioId: id },
        data: updateUsuarioDto,
      });

      await tx.logAtividade.create({
        data: {
          acao: 'ATUALIZACAO DE USUARIO',
          usuarioId: usuario.usuarioId,
        },
      });

      return usuario;
    });

    delete (usuarioAtualizado as { senha?: string }).senha;
    return usuarioAtualizado;
  }

  async remove(id: string) {
    const usuarioExiste = await this.prisma.usuario.findFirst({
      where: {
        usuarioId: id,
        status: 'ATIVO',
      },
      include: {
        contas: {
          include: {
            conta: true,
          },
        },
      },
    });

    if (!usuarioExiste) {
      throw new NotFoundException('Usuário não encontrado ou já inativo');
    }

    const possuiSaldoPendente = usuarioExiste.contas.some(
      (vinculo) => Number(vinculo.conta.saldo) !== 0,
    );

    if (possuiSaldoPendente) {
      throw new BadRequestException(
        'Não é possível inativar o usuário: existem contas com saldo pendente.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { usuarioId: id },
        data: { status: 'INATIVO' },
      }),
      this.prisma.logAtividade.create({
        data: {
          usuarioId: id,
          acao: 'INATIVACAO DE USUARIO',
        },
      }),
    ]);

    return { mensagem: 'Usuário inativado com sucesso' };
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      where: {
        status: 'ATIVO',
      },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        usuarioId: id,
        status: 'ATIVO',
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return usuario;
  }
}
