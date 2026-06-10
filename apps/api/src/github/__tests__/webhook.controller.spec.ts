import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WebhookController } from '../webhook.controller';
import { WebhookValidator } from '../webhook.validator';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { PR_REVIEW_QUEUE } from '../../queue/queue.module';

const WEBHOOK_SECRET = 'test-secret';

function makeSignature(body: string) {
  return 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

const mockPrisma = {
  repository: {
    upsert: jest.fn().mockResolvedValue({ id: 'repo-1', owner: 'acme', name: 'myapp', installationId: 42 }),
  },
  reviewRun: {
    create: jest.fn().mockResolvedValue({ id: 'run-1', prNumber: 7, status: 'PENDING' }),
  },
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'GITHUB_WEBHOOK_SECRET') return WEBHOOK_SECRET;
    throw new Error(`Unknown config key: ${key}`);
  }),
};

describe('WebhookController', () => {
  let controller: WebhookController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        WebhookValidator,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getQueueToken(PR_REVIEW_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  const prPayload = {
    action: 'opened',
    pull_request: { number: 7, title: 'feat: new thing' },
    repository: { name: 'myapp', owner: { login: 'acme' } },
    installation: { id: 42 },
  };

  function makeRequest(body: string) {
    return { rawBody: Buffer.from(body) } as never;
  }

  it('returns ok and runId for a valid pull_request opened event', async () => {
    const body = JSON.stringify(prPayload);
    const result = await controller.handle(
      makeRequest(body),
      makeSignature(body),
      'pull_request',
      prPayload,
    );
    expect(result).toEqual({ ok: true, runId: 'run-1' });
  });

  it('persists a ReviewRun and enqueues a job', async () => {
    const body = JSON.stringify(prPayload);
    await controller.handle(makeRequest(body), makeSignature(body), 'pull_request', prPayload);

    expect(mockPrisma.repository.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.reviewRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ prNumber: 7 }) }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-1', owner: 'acme', repo: 'myapp', pullNumber: 7 }),
    );
  });

  it('throws UnauthorizedException for an invalid signature', async () => {
    const body = JSON.stringify(prPayload);
    await expect(
      controller.handle(makeRequest(body), 'sha256=badsignature', 'pull_request', prPayload),
    ).rejects.toThrow('Invalid webhook signature');
  });

  it('skips non-pull_request events', async () => {
    const body = JSON.stringify({ action: 'created' });
    const result = await controller.handle(
      makeRequest(body),
      makeSignature(body),
      'push',
      { action: 'created' },
    );
    expect(result).toEqual({ ok: true, skipped: true });
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('skips pull_request events with unhandled actions (e.g. closed)', async () => {
    const payload = { ...prPayload, action: 'closed' };
    const body = JSON.stringify(payload);
    const result = await controller.handle(
      makeRequest(body),
      makeSignature(body),
      'pull_request',
      payload,
    );
    expect(result).toEqual({ ok: true, skipped: true });
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
