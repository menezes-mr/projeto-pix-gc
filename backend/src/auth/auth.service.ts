import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { identificador, senha } = loginDto;

    const usuario = await this.prisma.usuario.findFirst({
      relationLoadStrategy: 'join',
      where: {
        OR: [{ email: identificador }, { cpfCnpj: identificador }],
      },
      include: {
        contas: {
          include: {
            conta: {
              include: {
                usuarios: {
                  where: { papel: 'TITULAR' },
                  include: {
                    usuario: { select: { nomeCompleto: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (usuario.status === 'BLOQUEADO') {
      throw new ForbiddenException(
        'Acesso bloqueado: Usuário ou conta bloqueada por suspeita de fraude. Entre em contato com a administração.',
      );
    }

    if (usuario.status !== 'ATIVO') {
      throw new UnauthorizedException('Usuário inativo.');
    }

    const vinculoInicial =
      usuario.contas.find(
        (v) => v.papel === 'TITULAR' && v.conta.status === 'ATIVA',
      ) ??
      usuario.contas.find((v) => v.conta.status === 'ATIVA') ??
      usuario.contas.find((v) => v.papel === 'TITULAR') ??
      usuario.contas[0];
    let conta = vinculoInicial?.conta;
    let contaId = vinculoInicial?.contaId || null;
    const papelAtivo = vinculoInicial?.papel || 'TITULAR';

    if (conta && conta.status === 'BLOQUEADA') {
      throw new ForbiddenException(
        'Acesso bloqueado: Conta bancária bloqueada por suspeita de fraude. Entre em contato com a administração.',
      );
    }

    if (!contaId || !conta) {
      const numeroConta = `${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(Math.random() * 10)}`;
      const novaConta = await this.prisma.conta.create({
        data: {
          agencia: '0001',
          numeroConta,
          saldo: 0.0,
          limiteDiarioPix: 1000.0,
          status: 'ATIVA',
        },
        include: {
          usuarios: {
            where: { papel: 'TITULAR' },
            include: {
              usuario: { select: { nomeCompleto: true } },
            },
          },
        },
      });

      await this.prisma.usuarioConta.create({
        data: {
          usuarioId: usuario.usuarioId,
          contaId: novaConta.contaId,
          papel: 'TITULAR',
        },
      });

      contaId = novaConta.contaId;
      conta = novaConta;
    }

    const payload = { sub: usuario.usuarioId, email: usuario.email, contaId };
    const contasVinculadas = usuario.contas.map((v) => ({
      contaId: v.contaId,
      agencia: v.conta.agencia,
      numeroConta: v.conta.numeroConta,
      saldo: Number(v.conta.saldo),
      limiteDiarioPix: Number(v.conta.limiteDiarioPix),
      status: v.conta.status,
      papel: v.papel,
      titularNome:
        v.conta.usuarios?.[0]?.usuario?.nomeCompleto || usuario.nomeCompleto,
    }));

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.usuarioId,
        nome: usuario.nomeCompleto,
        email: usuario.email,
        documento: usuario.cpfCnpj,
        telefone: usuario.telefone,
        contaId,
        papel: papelAtivo,
        saldo: Number(conta.saldo),
        agencia: conta.agencia,
        numeroConta: conta.numeroConta,
        statusConta: conta.status,
        limiteDiarioPix: Number(conta.limiteDiarioPix),
        receberSms: usuario.receberSms,
        receberEmail: usuario.receberEmail,
        receberPush: usuario.receberPush,
        contas: contasVinculadas,
      },
    };
  }

  async listarMinhasContas(usuarioId: string) {
    const vinculos = await this.prisma.usuarioConta.findMany({
      relationLoadStrategy: 'join',
      where: { usuarioId },
      include: {
        conta: {
          include: {
            usuarios: {
              where: { papel: 'TITULAR' },
              include: {
                usuario: { select: { nomeCompleto: true } },
              },
            },
          },
        },
      },
    });

    return vinculos.map((v) => ({
      contaId: v.contaId,
      agencia: v.conta.agencia,
      numeroConta: v.conta.numeroConta,
      saldo: Number(v.conta.saldo),
      limiteDiarioPix: Number(v.conta.limiteDiarioPix),
      status: v.conta.status,
      papel: v.papel,
      titularNome: v.conta.usuarios?.[0]?.usuario?.nomeCompleto || 'Titular',
    }));
  }

  async trocarConta(usuarioId: string, contaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { usuarioId, status: 'ATIVO' },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    const vinculo = await this.prisma.usuarioConta.findFirst({
      where: { usuarioId, contaId },
      include: {
        conta: true,
      },
    });

    if (!vinculo) {
      throw new ForbiddenException(
        'Você não possui vínculo com a conta bancária selecionada.',
      );
    }

    if (vinculo.conta.status === 'BLOQUEADA') {
      throw new ForbiddenException(
        'Acesso bloqueado: Conta bancária bloqueada por suspeita de fraude.',
      );
    }

    const contasVinculadas = await this.listarMinhasContas(usuarioId);
    const payload = { sub: usuario.usuarioId, email: usuario.email, contaId };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.usuarioId,
        nome: usuario.nomeCompleto,
        email: usuario.email,
        documento: usuario.cpfCnpj,
        telefone: usuario.telefone,
        contaId: vinculo.contaId,
        papel: vinculo.papel,
        saldo: Number(vinculo.conta.saldo),
        agencia: vinculo.conta.agencia,
        numeroConta: vinculo.conta.numeroConta,
        statusConta: vinculo.conta.status,
        limiteDiarioPix: Number(vinculo.conta.limiteDiarioPix),
        receberSms: usuario.receberSms,
        receberEmail: usuario.receberEmail,
        receberPush: usuario.receberPush,
        contas: contasVinculadas,
      },
    };
  }

  async adminLogin(loginDto: LoginDto) {
    const { identificador, senha } = loginDto;
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: identificador }, { cpfCnpj: identificador }],
        papelSistema: 'ADMIN',
        status: 'ATIVO',
      },
    });

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      throw new UnauthorizedException(
        'Credenciais de administrador inválidas.',
      );
    }

    const payload = {
      sub: usuario.usuarioId,
      email: usuario.email,
      contaId: null,
    };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.usuarioId,
        nome: usuario.nomeCompleto,
        email: usuario.email,
        papelSistema: 'ADMIN',
      },
    };
  }
}
