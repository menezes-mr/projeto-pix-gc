import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { obterSegredoJwt } from './jwt-secret';

export interface JwtPayload {
  sub: string;
  email: string;
  contaId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usuariosService: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: obterSegredoJwt(),
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosService.findOne(payload.sub);
    if (!usuario) {
      throw new UnauthorizedException();
    }
    return {
      usuarioId: payload.sub,
      email: payload.email,
      papelSistema: usuario.papelSistema,
      contaId: payload.contaId,
      contaOrigemId: payload.contaId,
    };
  }
}
