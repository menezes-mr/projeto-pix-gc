import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestAutenticada } from '../auth/jwt-auth.guard';
import { PixAgendadoService } from './pix-agendado.service';

@Controller('pix/agendamentos')
@UseGuards(JwtAuthGuard)
export class PixAgendadoController {
  constructor(private readonly pixAgendadoService: PixAgendadoService) {}

  @Patch(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  async cancelar(
    @Param('id') transacaoId: string,
    @Req() request: RequestAutenticada,
  ) {
    const transacao = await this.pixAgendadoService.cancelar(
      transacaoId,
      request.user.usuarioId,
    );

    return { mensagem: 'Transação PIX cancelada com sucesso', transacao };
  }
}
