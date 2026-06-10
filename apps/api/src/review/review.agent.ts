import { Injectable, Logger } from '@nestjs/common';
import { FileDiff } from '../github/diff.parser';
import { LlmProvider, FileReview } from '../llm/llm-provider.interface';

@Injectable()
export class ReviewAgent {
  private readonly logger = new Logger(ReviewAgent.name);

  async reviewFile(diff: FileDiff, packs: string, provider: LlmProvider): Promise<FileReview> {
    this.logger.debug(`Reviewing ${diff.filename} (${diff.additions}+ ${diff.deletions}-)`);
    return provider.reviewFile(diff.filename, diff.patch, packs);
  }
}
