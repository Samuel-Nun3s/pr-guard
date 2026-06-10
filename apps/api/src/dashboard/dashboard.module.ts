import { Module } from '@nestjs/common';
import { ReposController } from './repos.controller';
import { RunsController } from './runs.controller';
import { ConfigController } from './config.controller';
import { UsageController } from './usage.controller';

@Module({
  controllers: [ReposController, RunsController, ConfigController, UsageController],
})
export class DashboardModule {}
