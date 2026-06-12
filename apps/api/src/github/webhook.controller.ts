import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request } from 'express';
import { WebhookValidator } from './webhook.validator';
import { PrismaService } from '../prisma/prisma.service';
import { PR_REVIEW_QUEUE } from '../queue/queue.module';
import { PrReviewJob } from '../review/review.processor';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly validator: WebhookValidator,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(PR_REVIEW_QUEUE) private readonly reviewQueue: Queue<PrReviewJob>,
  ) {}

  @Post('github')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const secret = this.config.getOrThrow<string>('GITHUB_WEBHOOK_SECRET');
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));

    if (!this.validator.validate(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (event !== 'pull_request') return { ok: true, skipped: true };

    const action = payload['action'] as string;
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return { ok: true, skipped: true };
    }

    const pr = payload['pull_request'] as Record<string, unknown>;
    const repo = payload['repository'] as Record<string, unknown>;
    const installation = payload['installation'] as Record<string, unknown>;

    const owner = (repo['owner'] as Record<string, unknown>)['login'] as string;
    const repoName = repo['name'] as string;
    const installationId = installation['id'] as number;
    const prNumber = pr['number'] as number;
    const prTitle = pr['title'] as string;

    const repository = await this.prisma.repository.upsert({
      where: { installationId },
      update: { active: true },
      create: { owner, name: repoName, installationId },
    });

    const run = await this.prisma.reviewRun.create({
      data: {
        repositoryId: repository.id,
        prNumber,
        prTitle,
        status: 'PENDING',
      },
    });

    await this.reviewQueue.add(
      {
        repositoryId: repository.id,
        runId: run.id,
        owner,
        repo: repoName,
        pullNumber: prNumber,
        installationId,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 30_000 } },
    );

    this.logger.log(`Enqueued review run ${run.id} for ${owner}/${repoName}#${prNumber}`);
    return { ok: true, runId: run.id };
  }
}
