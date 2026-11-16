import 'dotenv/config';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Optional() options?: Prisma.PrismaClientOptions) {
    super({
      transactionOptions: {
        maxWait: 15000,
        timeout: 30000,
      },
      ...options,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
