import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SharedModule } from '../shared/shared.module';
import { PixTransferenciaController } from './pix-transferencia.controller';
import { PixTransferenciaService } from './pix-transferencia.service';

@Module({
  imports: [JwtModule.register({}), SharedModule],
  controllers: [PixTransferenciaController],
  providers: [PixTransferenciaService, JwtAuthGuard],
})
export class PixTransferenciaModule {}
