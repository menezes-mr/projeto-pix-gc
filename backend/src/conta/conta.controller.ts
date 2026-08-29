import {
  Controller,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContaService } from './conta.service';
import { UpdateContaDto } from './dto/update-conta.dto';

@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async atualizarConfiguracoes(
    @Param('id') contaId: string,
    @Body() updateContaDto: UpdateContaDto,
  ) {
    return await this.contaService.atualizarConfiguracoes(contaId, updateContaDto);
  }
}