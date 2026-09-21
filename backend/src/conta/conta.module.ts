import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ContaController } from './conta.controller';
import { ContaService } from './conta.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [ContaController],
  providers: [ContaService],
  exports: [ContaService],
})
export class ContaModule {}