import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userRole = request.headers['x-user-role'];

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Acesso negado: apenas administradores podem realizar esta operação.',
      );
    }

    return true;
  }
}
