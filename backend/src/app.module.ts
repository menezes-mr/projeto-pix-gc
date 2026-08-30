import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ContaModule } from './conta/conta.module';

@Module({
  imports: [PrismaModule, ContaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}