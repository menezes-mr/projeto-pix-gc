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
} from '@nestjs/common';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dto/create-conta.dto';
import { UpdateContaDto } from './dto/update-conta.dto';
import { ExtratoQueryDto } from './dto/extrato-query.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { BloquearContaDto } from './dto/bloquear-conta.dto';
import { AdminRoleGuard } from '../common/guards/roles.guard';

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
  async consultarSaldo(@Param('id') contaId: string, @Req() req: any) {
    
    const idUsuarioLogado =
      req.user?.usuarioId ||
      req.user?.sub ||
      req.headers['x-usuario-id'] ||
      'usuario-mock-id';

    return await this.contaService.consultarSaldo(contaId, idUsuarioLogado);
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
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criarConta(@Body() createContaDto: CreateContaDto) {
    return await this.contaService.criarConta(createContaDto);
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