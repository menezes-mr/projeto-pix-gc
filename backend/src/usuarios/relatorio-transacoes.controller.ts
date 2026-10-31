import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { RelatorioTransacoesService } from './relatorio-transacoes.service';

@Controller('usuarios')
export class RelatorioTransacoesController {
  constructor(private readonly relatorioService: RelatorioTransacoesService) {}

  @Get(':id/relatorios/transacoes')
  @UseGuards(JwtAuthGuard)
  gerar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestAutenticada,
  ) {
    return this.relatorioService.gerar(id, request.user.usuarioId);
  }
}
