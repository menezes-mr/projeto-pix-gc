import { Module } from '@nestjs/common';
import { PixRecebimentoController } from './pix-recebimento.controller';
import { PixRecebimentoService } from './pix-recebimento.service';

@Module({
  controllers: [PixRecebimentoController],
  providers: [PixRecebimentoService],
})
export class PixRecebimentoModule {}
