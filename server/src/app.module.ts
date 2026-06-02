import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GenerateModule } from './generate/generate.module';
import { HistoryModule } from './history/history.module';
import { UploadModule } from './upload/upload.module';
import { AppConfigModule } from './config/config.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '5', 10) }]),
    GenerateModule,
    HistoryModule,
    UploadModule,
    AppConfigModule,
    AdminModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
