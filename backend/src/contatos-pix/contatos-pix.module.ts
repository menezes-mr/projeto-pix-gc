import { Module } from '@nestjs/common';
import { ContatosPixController } from './contatos-pix.controller';
import { ContatosPixService } from './contatos-pix.service';

@Module({
  controllers: [ContatosPixController],
  providers: [ContatosPixService],
  exports: [ContatosPixService],
})
export class ContatosPixModule {}
