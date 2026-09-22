import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PixRecebimentoService } from './pix-recebimento.service';

import { RecebimentoPixDto } from './dto/recebimento-pix.dto';

@Controller('pix/recebimento')
export class PixRecebimentoController {
  constructor(private readonly pixRecebimentoService: PixRecebimentoService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receber(@Body() dto: RecebimentoPixDto) {
    return this.pixRecebimentoService.receberPix(
      dto.chavePixDestino,
      dto.valor,
      dto.transacaoExternaId,
    );
  }
}
