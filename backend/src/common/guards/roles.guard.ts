import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import type { RequestAutenticada } from '../../auth/jwt-auth.guard';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestAutenticada>();
    const userRole = request.user?.papelSistema;

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Acesso negado: apenas administradores podem realizar esta operação.',
      );
    }

    return true;
  }
}
