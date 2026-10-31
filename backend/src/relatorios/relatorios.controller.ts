import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RelatoriosService } from './relatorios.service';
import { RelatorioTransacoesQueryDto } from './dto/relatorio-transacoes-query.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

@ApiTags('Administração - Relatórios')
@Controller('admin/relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('transacoes')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar relatório global de transações (Requer ADMIN)',
  })
  @ApiHeader({
    name: 'x-user-role',
    required: true,
    description: 'Papel do usuário (deve ser ADMIN)',
  })
  async relatorioTransacoes(@Query() query: RelatorioTransacoesQueryDto) {
    return this.relatoriosService.gerarRelatorioTransacoes(
      query.dataInicio,
      query.dataFim,
    );
  }
}
