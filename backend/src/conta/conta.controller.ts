import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
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
  async consultarSaldo(@Param('id') contaId: string, @Req() req: any) {
    // Obtém o usuarioId do token/contexto da requisição (req.user) ou via header/mock
    const idUsuarioLogado =
      req.user?.usuarioId ||
      req.user?.sub ||
      req.headers['x-usuario-id'] ||
      'usuario-mock-id';

    return await this.contaService.consultarSaldo(contaId, idUsuarioLogado);
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async encerrarConta(@Param('id') contaId: string) {
    return await this.contaService.encerrarConta(contaId);
  }
}