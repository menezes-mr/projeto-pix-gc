import { Module } from '@nestjs/common';
import { HistoricoPixService } from './historico-pix/historico-pix.service';

@Module({
  providers: [HistoricoPixService],
  exports: [HistoricoPixService],
})
export class SharedModule {}
