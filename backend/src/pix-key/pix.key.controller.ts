import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PixKeyService } from './pix.key.service';
import { CreateRandomKeyDto } from './dto/create.random.key.dto';

@Controller('pix/chaves')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post('aleatoria')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRandomKeyDto) {
    return this.pixKeyService.generateRandomKey(dto.contaId, dto.usuarioId);
  }
}