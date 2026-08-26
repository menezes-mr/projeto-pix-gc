import { Controller, Post, Body } from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreateRandomKeyDto } from './dto/create-random-key.dto';

@Controller('pix/keys')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post('random')
  async create(@Body() dto: CreateRandomKeyDto) {
    return this.pixKeyService.generateRandomKey(dto.contaId);
  }
}