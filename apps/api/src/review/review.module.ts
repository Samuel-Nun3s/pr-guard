import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReviewProcessor } from './review.processor';
import { ReviewAgent } from './review.agent';
import { CommentFormatter } from './comment.formatter';
import { EventsPublisher } from './events.publisher';
import { EventBus } from './event.bus';
import { GithubModule } from '../github/github.module';
import { LlmModule } from '../llm/llm.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PR_REVIEW_QUEUE } from '../queue/queue.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: PR_REVIEW_QUEUE }),
    GithubModule,
    LlmModule,
    KnowledgeModule,
  ],
  providers: [EventBus, EventsPublisher, ReviewProcessor, ReviewAgent, CommentFormatter],
  exports: [EventBus],
})
export class ReviewModule {}
