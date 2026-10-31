import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestAutenticada } from '../auth/jwt-auth.guard';
import { PixAgendadoService } from './pix-agendado.service';

@ApiTags('Pix Agendamentos')
@ApiBearerAuth()
@Controller('pix/agendamentos')
@UseGuards(JwtAuthGuard)
export class PixAgendadoController {
  constructor(private readonly pixAgendadoService: PixAgendadoService) {}

  @Patch(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar agendamento de PIX' })
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
