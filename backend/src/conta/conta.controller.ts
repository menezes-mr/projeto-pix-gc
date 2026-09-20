import {
  Controller,
  Delete,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';

@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async buscarContaPorId(@Param('id') contaId: string) {
    return await this.contaService.buscarContaPorId(contaId);
  }

  @Get(':id/saldo')
  @HttpCode(HttpStatus.OK)
  async consultarSaldo(@Param('id') contaId: string) {
    return await this.contaService.consultarSaldo(contaId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criarConta(@Body() createContaDto: CreateContaDto) {
    return await this.contaService.criarConta(createContaDto);
  }

  @Get(':id/transacoes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
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
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async atualizarConfiguracoes(
    @Param('id') contaId: string,
    @Body() updateContaDto: UpdateContaDto,
  ) {
    return await this.contaService.atualizarConfiguracoes(contaId, updateContaDto);
  }

  @Patch(':id/bloquear')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  async bloquearContaPorFraude(
    @Param('id') contaId: string,
    @Body() bloquearContaDto: BloquearContaDto,
  ) {
    return await this.contaService.bloquearContaPorFraude(contaId, bloquearContaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async encerrarConta(@Param('id') contaId: string) {
    return await this.contaService.encerrarConta(contaId);
  }
}