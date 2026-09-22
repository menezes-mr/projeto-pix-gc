import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';
import { RelatorioTransacoesQueryDto } from './dto/relatorio-transacoes-query.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

@Controller('admin/relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('transacoes')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  async relatorioTransacoes(@Query() query: RelatorioTransacoesQueryDto) {
    return this.relatoriosService.gerarRelatorioTransacoes(
      query.dataInicio,
      query.dataFim,
    );
  }
}