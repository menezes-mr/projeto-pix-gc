import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface TokenPayload {
  sub?: string;
  contaOrigemId?: string;
}

export interface RequestAutenticada extends Request {
  user: {
    usuarioId: string;
    contaOrigemId: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticada>();
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];

    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token não informado');
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET não configurado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret,
      });

      if (!payload.sub || !payload.contaOrigemId) {
        throw new UnauthorizedException('Token inválido');
      }

      request.user = {
        usuarioId: payload.sub,
        contaOrigemId: payload.contaOrigemId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
