import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// NOTE: For runtime with a PostgreSQL adapter (e.g. @prisma/adapter-pg + PrismaPg),
// pass `{ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) }`
// to super(). The plain super() here keeps the PrismaClient.prototype spies working
// in the test environment and avoids a peer dependency on @prisma/adapter-pg.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
