import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookValidator } from './webhook.validator';
import { GithubApiService } from './github-api.service';
import { DiffParser } from './diff.parser';

@Module({
  controllers: [WebhookController],
  providers: [WebhookValidator, GithubApiService, DiffParser],
  exports: [GithubApiService, DiffParser],
})
export class GithubModule {}
