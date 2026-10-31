import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { RelatorioTransacoesService } from './relatorio-transacoes.service';

@ApiTags('Usuários - Relatório')
@ApiBearerAuth()
@Controller('usuarios')
export class RelatorioTransacoesController {
  constructor(private readonly relatorioService: RelatorioTransacoesService) {}

  @Get(':id/relatorios/transacoes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gerar relatório de transações do usuário' })
  gerar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestAutenticada,
  ) {
    return this.relatorioService.gerar(id, request.user.usuarioId);
  }
}
