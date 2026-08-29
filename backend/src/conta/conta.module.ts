import { Module } from '@nestjs/common';
import { ContaService } from './conta.service';
import { ContaController } from './conta.controller';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  controllers: [ContaController],
  providers: [ContaService, PrismaService], 
})
export class ContaModule {}