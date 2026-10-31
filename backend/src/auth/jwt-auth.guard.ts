import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

export interface RequestAutenticada extends Request {
  user: {
    usuarioId: string;
    email: string;
    contaId?: string;
    contaOrigemId: string;
  };
}
