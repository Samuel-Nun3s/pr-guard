import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PR_REVIEW_QUEUE } from '../queue/queue.module';

export interface PrReviewJob {
  repositoryId: string;
  runId: string;
  owner: string;
  repo: string;
  pullNumber: number;
  installationId: number;
}

@Processor(PR_REVIEW_QUEUE)
export class ReviewProcessor {
  private readonly logger = new Logger(ReviewProcessor.name);

  @Process()
  async handle(job: Job<PrReviewJob>) {
    this.logger.log(`Processing PR review job ${job.id} for run ${job.data.runId}`);
    // Phase 2: full review orchestration
  }
}
