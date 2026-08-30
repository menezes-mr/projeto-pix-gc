import { Module } from '@nestjs/common';
import { PixKeyController } from './pix.key.controller';
import { PixKeyService } from './pix.key.service';

@Module({
  controllers: [PixKeyController],
  providers: [PixKeyService],
})
export class PixKeyModule {}