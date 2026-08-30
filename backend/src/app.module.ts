import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PixKeyModule } from './pix-key/pix.key.module';
import { PixRecebimentoModule } from './pix-recebimento/pix.recebimento.module';

@Module({
  imports: [PrismaModule, PixKeyModule,PixRecebimentoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
