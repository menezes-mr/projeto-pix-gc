import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RelatoriosService } from './relatorios.service';
import { RelatorioTransacoesQueryDto } from './dto/relatorio-transacoes-query.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

@ApiTags('Administração - Relatórios')
@Controller('admin/relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('transacoes')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar relatório global de transações (Requer ADMIN)',
  })
  async relatorioTransacoes(@Query() query: RelatorioTransacoesQueryDto) {
    return this.relatoriosService.gerarRelatorioTransacoes(
      query.dataInicio,
      query.dataFim,
    );
  }

  @Get('contas')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Listar contas bancárias para monitoramento antifraude (Requer ADMIN)',
  })
  async listarContas() {
    return this.relatoriosService.listarTodasContas();
  }
}
