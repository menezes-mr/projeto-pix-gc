import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { RelatorioTransacoesService } from './relatorio-transacoes.service';

@ApiTags('Usuários - Relatório')
@ApiBearerAuth()
@Controller('usuarios')
export class RelatorioTransacoesController {
  constructor(private readonly relatorioService: RelatorioTransacoesService) {}

  @Get(':id/relatorios/transacoes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Gerar relatório consolidado de transações do usuário por período',
  })
  @ApiQuery({ name: 'dataInicio', required: false, type: String })
  @ApiQuery({ name: 'dataFim', required: false, type: String })
  gerar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestAutenticada,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.relatorioService.gerar(
      id,
      request.user.usuarioId,
      dataInicio,
      dataFim,
    );
  }
}
