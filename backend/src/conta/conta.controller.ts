import {
  Controller,
  Delete,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { ExtratoQueryDto } from './dto/extrato-query.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { BloquearContaDto } from './dto/bloquear-conta.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

@ApiTags('Contas')
@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar dados da conta por ID' })
  async buscarContaPorId(@Param('id') contaId: string) {
    return await this.contaService.buscarContaPorId(contaId);
  }

  @Get(':id/saldo')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar saldo disponível da conta' })
  @ApiHeader({
    name: 'x-usuario-id',
    required: false,
    description:
      'ID do usuário logado (opcional se autenticado via Bearer token)',
  })
  async consultarSaldo(
    @Param('id') contaId: string,
    @Req() req: Request & { user?: { usuarioId?: string; sub?: string } },
  ) {
    const usuarioId = req.user?.usuarioId ?? req.user?.sub;
    const headerId = req.headers['x-usuario-id'];
    const idUsuarioLogado =
      usuarioId ??
      (typeof headerId === 'string' ? headerId : 'usuario-mock-id');

    return await this.contaService.consultarSaldo(contaId, idUsuarioLogado);
  }

  @Get(':id/transacoes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar transações e extrato da conta' })
  async listarTransacoes(
    @Param('id') contaId: string,
    @Query() query: ExtratoQueryDto,
    @Req() req: RequestAutenticada,
  ) {
    return await this.contaService.listarTransacoes(
      contaId,
      req.user.usuarioId,
      query.page,
      query.limit,
      query.dataInicio,
      query.dataFim,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova conta bancária' })
  async criarConta(@Body() createContaDto: CreateContaDto) {
    return await this.contaService.criarConta(createContaDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar configurações de limites da conta' })
  async atualizarConfiguracoes(
    @Param('id') contaId: string,
    @Body() updateContaDto: UpdateContaDto,
  ) {
    return await this.contaService.atualizarConfiguracoes(
      contaId,
      updateContaDto,
    );
  }

  @Patch(':id/bloquear')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bloquear conta por suspeita de fraude (Requer ADMIN)',
  })
  @ApiHeader({
    name: 'x-user-role',
    required: true,
    description: 'Papel do usuário (deve ser ADMIN)',
  })
  async bloquearContaPorFraude(
    @Param('id') contaId: string,
    @Body() bloquearContaDto: BloquearContaDto,
  ) {
    return await this.contaService.bloquearContaPorFraude(
      contaId,
      bloquearContaDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar conta bancária' })
  async encerrarConta(@Param('id') contaId: string) {
    return await this.contaService.encerrarConta(contaId);
  }
}
