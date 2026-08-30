import { Module } from '@nestjs/common';
import { PixTransferenciaService } from './pix-transferencia.service';

@Module({
  providers: [PixTransferenciaService],
})
export class PixTransferenciaModule {}
