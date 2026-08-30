import {
  Controller,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContaService } from './conta.service';

@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async encerrarConta(@Param('id') contaId: string) {
    return await this.contaService.encerrarConta(contaId);
  }
}