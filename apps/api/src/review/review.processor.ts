import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { GithubApiService } from '../github/github-api.service';
import { DiffParser } from '../github/diff.parser';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { PrReviewConfigParser } from '../knowledge/pr-review-config.parser';
import { CryptoService } from '../llm/crypto.service';
import { CostCalculator } from '../llm/cost.calculator';
import { AnthropicProvider } from '../llm/anthropic.provider';
import { TokenUsage } from '../llm/llm-provider.interface';
import { ReviewAgent } from './review.agent';
import { CommentFormatter } from './comment.formatter';
import { EventsPublisher } from './events.publisher';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubApiService,
    private readonly diffParser: DiffParser,
    private readonly knowledge: KnowledgeService,
    private readonly configParser: PrReviewConfigParser,
    private readonly crypto: CryptoService,
    private readonly costCalculator: CostCalculator,
    private readonly agent: ReviewAgent,
    private readonly formatter: CommentFormatter,
    private readonly events: EventsPublisher,
  ) {}

  @Process()
  async handle(job: Job<PrReviewJob>) {
    const { repositoryId, runId, owner, repo, pullNumber, installationId } = job.data;
    this.logger.log(`Starting review run ${runId} for ${owner}/${repo}#${pullNumber}`);

    await this.prisma.reviewRun.update({ where: { id: runId }, data: { status: 'RUNNING' } });
    await this.events.publish(runId, 'queued');

    try {
      const [commitSha, files, llmConfig, prReviewRaw] = await Promise.all([
        this.github.getHeadCommitSha(owner, repo, pullNumber, installationId),
        this.github.getPullRequestFiles(owner, repo, pullNumber, installationId),
        this.prisma.llmConfig.findFirst(),
        this.github.getFileContent(owner, repo, '.prreview.json', installationId),
      ]);

      if (!llmConfig) throw new Error('No LLM config found. Add one via Settings.');

      const prReviewConfig = this.configParser.parse(prReviewRaw);

      const allDiffs = this.diffParser.parse(files);
      const diffs = allDiffs.filter(
        (d) => !this.configParser.shouldIgnoreFile(d.filename, prReviewConfig.ignoreFiles),
      );

      this.logger.log(
        `${diffs.length}/${allDiffs.length} files to review after ignore filter`,
      );
      await this.events.publish(runId, 'diff_loaded', { fileCount: diffs.length });

      const packs = await this.knowledge.getActivePacksText(repositoryId);
      const apiKey = this.crypto.decrypt(llmConfig.encryptedKey);
      const provider = new AnthropicProvider(apiKey, llmConfig.model);

      const pricing = await this.prisma.modelPricing.findUnique({
        where: { provider_model: { provider: llmConfig.provider, model: llmConfig.model } },
      });

      const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
      const allFormattedComments: Array<{ path: string; line: number; body: string }> = [];
      const summaries: string[] = [];

      for (let i = 0; i < diffs.length; i++) {
        const diff = diffs[i];
        await this.events.publish(runId, 'reviewing_file', {
          file: diff.filename,
          index: i + 1,
          total: diffs.length,
        });

        const fileReview = await this.agent.reviewFile(diff, packs, provider);

        totalUsage.inputTokens += fileReview.usage.inputTokens;
        totalUsage.outputTokens += fileReview.usage.outputTokens;
        totalUsage.cacheReadTokens += fileReview.usage.cacheReadTokens;
        totalUsage.cacheCreationTokens += fileReview.usage.cacheCreationTokens;

        const eligibleComments = fileReview.comments.filter((c) =>
          this.configParser.meetsSeverityThreshold(c.severity, prReviewConfig.minSeverity),
        );

        if (fileReview.summary) summaries.push(`**${diff.filename}:** ${fileReview.summary}`);

        const formatted = this.formatter.format(diff.filename, eligibleComments, diff.addedLines);
        allFormattedComments.push(...formatted);

        await this.prisma.reviewComment.createMany({
          data: eligibleComments.map((c) => ({
            runId,
            path: diff.filename,
            line: c.line,
            severity: c.severity,
            body: c.body,
          })),
        });
      }

      const overallSummary = summaries.join('\n\n') || 'No significant issues found.';
      const costCents = pricing ? this.costCalculator.calculate(totalUsage, pricing) : 0;

      if (allFormattedComments.length > 0) {
        await this.github.postReviewComments(
          owner, repo, pullNumber, installationId,
          allFormattedComments, overallSummary, commitSha,
        );
      }

      await this.events.publish(runId, 'comments_posted', { count: allFormattedComments.length });

      await this.prisma.reviewRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          model: llmConfig.model,
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
          cacheReadTokens: totalUsage.cacheReadTokens,
          cacheCreationTokens: totalUsage.cacheCreationTokens,
          costCents,
        },
      });

      await this.events.publish(runId, 'completed', { costCents, totalComments: allFormattedComments.length });
      this.logger.log(`Completed run ${runId} — ${allFormattedComments.length} comments, $${(costCents / 100).toFixed(4)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Review run ${runId} failed: ${message}`);
      await this.prisma.reviewRun.update({ where: { id: runId }, data: { status: 'FAILED' } });
      await this.events.publish(runId, 'failed', { error: message });
      throw err;
    }
  }
}
