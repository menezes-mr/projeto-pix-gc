import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreateRandomKeyDto } from './dto/create.random.key.dto';
import { CreateChavePixDto } from './dto/create-chave-pix.dto';

@Controller('pix/chaves')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post('aleatoria')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRandomKeyDto) {
    return this.pixKeyService.generateRandomKey(dto.contaId, dto.usuarioId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChave(@Body() dto: CreateChavePixDto) {
    return this.pixKeyService.associarChavePix(dto);
  }

  @Get(':valorChave')
  async validarChave(@Param('valorChave') valorChave: string) {
    return this.pixKeyService.validarChavePix(valorChave);
  }
}