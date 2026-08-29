import { Module } from '@nestjs/common';
import { ContaModule } from './conta/conta.module';

@Module({
  imports: [ContaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}