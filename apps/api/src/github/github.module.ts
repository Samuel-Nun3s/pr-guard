import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookController } from './webhook.controller';
import { WebhookValidator } from './webhook.validator';
import { GithubApiService } from './github-api.service';
import { DiffParser } from './diff.parser';
import { PR_REVIEW_QUEUE } from '../queue/queue.module';

@Module({
  imports: [BullModule.registerQueue({ name: PR_REVIEW_QUEUE })],
  controllers: [WebhookController],
  providers: [WebhookValidator, GithubApiService, DiffParser],
  exports: [GithubApiService, DiffParser, WebhookValidator],
})
export class GithubModule {}
