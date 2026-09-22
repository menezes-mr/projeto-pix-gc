import { Injectable, UnauthorizedException } from '@nestjs/common';
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

    // Busca usuário pelo CPF/CNPJ ou Email
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identificador },
          { cpfCnpj: identificador },
        ],
        status: 'ATIVO',
      },
      include: {
        contas: {
          include: { conta: true },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Compara a senha
    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Pega a conta principal (primeira vinculada)
    const contaId = usuario.contas[0]?.contaId || null;
    const saldo = usuario.contas[0]?.conta?.saldo || 0;

    // Gera o token JWT
    const payload = { sub: usuario.usuarioId, email: usuario.email, contaId };
    
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.usuarioId,
        nome: usuario.nomeCompleto,
        email: usuario.email,
        documento: usuario.cpfCnpj,
        telefone: usuario.telefone,
        contaId,
        saldo: Number(saldo),
      },
    };
  }
}
