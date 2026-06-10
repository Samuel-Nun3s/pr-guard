import { Module } from '@nestjs/common';
import { ReviewProcessor } from './review.processor';
import { ReviewAgent } from './review.agent';
import { CommentFormatter } from './comment.formatter';
import { EventsPublisher } from './events.publisher';
import { GithubModule } from '../github/github.module';
import { LlmModule } from '../llm/llm.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [GithubModule, LlmModule, KnowledgeModule],
  providers: [ReviewProcessor, ReviewAgent, CommentFormatter, EventsPublisher],
})
export class ReviewModule {}
