import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ContaService } from './conta.service';
import { CreateContaDto } from './dto/create-conta.dto';

@Controller('contas')
export class ContaController {
  constructor(private readonly contaService: ContaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criarConta(@Body() createContaDto: CreateContaDto) {
    return await this.contaService.criarConta(createContaDto);
  }
}