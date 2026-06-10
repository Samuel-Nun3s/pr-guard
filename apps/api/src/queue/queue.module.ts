import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const PR_REVIEW_QUEUE = 'pr-review';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    BullModule.registerQueue({ name: PR_REVIEW_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
