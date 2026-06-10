import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { ReviewModule } from './review/review.module';
import { LlmModule } from './llm/llm.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    GithubModule,
    LlmModule,
    KnowledgeModule,
    ReviewModule,
    DashboardModule,
  ],
})
export class AppModule {}
