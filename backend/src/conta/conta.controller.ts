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
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { ExtratoQueryDto } from './dto/extrato-query.dto';
import { AdicionarCotitularDto } from './dto/adicionar-cotitular.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { BloquearContaDto } from './dto/bloquear-conta.dto';
import { DesbloquearContaDto } from './dto/desbloquear-conta.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

@ApiTags('Contas')
@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar dados da conta por ID' })
  async buscarContaPorId(
    @Param('id') contaId: string,
    @Req() req: RequestAutenticada,
  ) {
    await this.contaService.verificarVinculo(contaId, req.user.usuarioId);
    return await this.contaService.buscarContaPorId(contaId);
  }

  @Get(':id/saldo')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar saldo disponível da conta' })
  async consultarSaldo(
    @Param('id') contaId: string,
    @Req() req: RequestAutenticada,
  ) {
    return await this.contaService.consultarSaldo(contaId, req.user.usuarioId);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova conta bancária' })
  async criarConta(
    @Body() createContaDto: CreateContaDto,
    @Req() req: RequestAutenticada,
  ) {
    if (createContaDto.usuarioId !== req.user.usuarioId) {
      throw new ForbiddenException(
        'A conta deve pertencer ao usuário autenticado.',
      );
    }
    return await this.contaService.criarConta(createContaDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar configurações de limites da conta' })
  async atualizarConfiguracoes(
    @Param('id') contaId: string,
    @Body() updateContaDto: UpdateContaDto,
    @Req() req: RequestAutenticada,
  ) {
    await this.contaService.verificarTitular(contaId, req.user.usuarioId);
    updateContaDto.usuarioId = req.user.usuarioId;
    return await this.contaService.atualizarConfiguracoes(
      contaId,
      updateContaDto,
    );
  }

  @Patch(':id/bloquear')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bloquear conta por suspeita de fraude (Requer ADMIN)',
  })
  async bloquearContaPorFraude(
    @Param('id') contaId: string,
    @Body() bloquearContaDto: BloquearContaDto,
    @Req() req: RequestAutenticada,
  ) {
    bloquearContaDto.usuarioId = req.user.usuarioId;
    return await this.contaService.bloquearContaPorFraude(
      contaId,
      bloquearContaDto,
    );
  }

  @Patch(':id/desbloquear')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desbloquear conta bancária (Requer ADMIN)',
  })
  async desbloquearConta(
    @Param('id') contaId: string,
    @Body() dto?: DesbloquearContaDto,
  ) {
    return await this.contaService.desbloquearConta(contaId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar conta bancária' })
  async encerrarConta(
    @Param('id') contaId: string,
    @Req() req: RequestAutenticada,
  ) {
    await this.contaService.verificarTitular(contaId, req.user.usuarioId);
    return await this.contaService.encerrarConta(contaId, req.user.usuarioId);
  }

  @Get(':id/titulares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar titulares e cotitulares da conta' })
  async listarCotitulares(
    @Param('id') contaId: string,
    @Req() req: RequestAutenticada,
  ) {
    await this.contaService.verificarVinculo(contaId, req.user.usuarioId);
    return await this.contaService.listarCotitulares(contaId);
  }

  @Post(':id/titulares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar cotitular à conta bancária' })
  async adicionarCotitular(
    @Param('id') contaId: string,
    @Body() dto: AdicionarCotitularDto,
    @Req() req: RequestAutenticada,
  ) {
    return await this.contaService.adicionarCotitular(
      contaId,
      req.user.usuarioId,
      dto,
    );
  }

  @Delete(':id/titulares/:usuarioId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover cotitular da conta bancária' })
  async removerCotitular(
    @Param('id') contaId: string,
    @Param('usuarioId') usuarioId: string,
    @Req() req: RequestAutenticada,
  ) {
    return await this.contaService.removerCotitular(
      contaId,
      req.user.usuarioId,
      usuarioId,
    );
  }
}
