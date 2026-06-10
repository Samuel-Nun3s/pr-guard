import { Module } from '@nestjs/common';
import { ReposController } from './repos.controller';
import { RunsController } from './runs.controller';
import { ConfigController } from './config.controller';
import { UsageController } from './usage.controller';
import { ReviewModule } from '../review/review.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [ReviewModule, LlmModule],
  controllers: [ReposController, RunsController, ConfigController, UsageController],
})
export class DashboardModule {}
