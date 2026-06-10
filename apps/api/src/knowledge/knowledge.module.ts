import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { PromptBuilder } from './prompt.builder';
import { PrReviewConfigParser } from './pr-review-config.parser';

@Module({
  providers: [KnowledgeService, PromptBuilder, PrReviewConfigParser],
  exports: [KnowledgeService, PrReviewConfigParser],
})
export class KnowledgeModule {}
