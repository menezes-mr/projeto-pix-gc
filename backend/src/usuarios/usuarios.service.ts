import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
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
          acao: 'INATIVACAO_USUARIO',
        },
      }),
    ]);

    return { mensagem: 'Usuário inativado com sucesso' };
  }
}
