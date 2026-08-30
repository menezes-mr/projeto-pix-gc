import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';
import { PrismaModule } from './prisma/prisma.module';
import { PixKeyModule } from './pix-key/pix-key.module';

@Module({
  imports: [PrismaModule, PixKeyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}