import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from '../usage.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../../auth/auth.guard';

function makeRun(overrides: Partial<{
  repositoryId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  createdAt: Date;
}> = {}) {
  return {
    repositoryId: 'repo-1',
    model: 'claude-opus-4-8',
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    cacheCreationTokens: 100,
    costCents: 50,
    createdAt: new Date('2026-06-10T10:00:00Z'),
    repository: { owner: 'acme', name: 'app' },
    ...overrides,
  };
}

describe('UsageController', () => {
  let controller: UsageController;
  let mockPrisma: { reviewRun: { findMany: jest.Mock } };

  beforeEach(async () => {
    mockPrisma = { reviewRun: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsageController>(UsageController);
  });

  describe('totals', () => {
    it('returns zero totals when no runs exist', async () => {
      mockPrisma.reviewRun.findMany.mockResolvedValue([]);
      const result = await controller.aggregate();
      expect(result.totals).toEqual({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costCents: 0, runs: 0 });
    });

    it('sums all token fields across runs', async () => {
      mockPrisma.reviewRun.findMany.mockResolvedValue([
        makeRun({ inputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheCreationTokens: 100, costCents: 50 }),
        makeRun({ inputTokens: 2000, outputTokens: 800, cacheReadTokens: 400, cacheCreationTokens: 200, costCents: 80 }),
      ]);

      const result = await controller.aggregate();
      expect(result.totals.inputTokens).toBe(3000);
      expect(result.totals.outputTokens).toBe(1300);
      expect(result.totals.costCents).toBe(130);
      expect(result.totals.runs).toBe(2);
    });
  });

  describe('groupBy=day', () => {
    it('groups runs by ISO date', async () => {
      mockPrisma.reviewRun.findMany.mockResolvedValue([
        makeRun({ costCents: 10, createdAt: new Date('2026-06-09T08:00:00Z') }),
        makeRun({ costCents: 20, createdAt: new Date('2026-06-09T18:00:00Z') }),
        makeRun({ costCents: 30, createdAt: new Date('2026-06-10T10:00:00Z') }),
      ]);

      const result = await controller.aggregate(undefined, undefined, 'day');
      expect(result.grouped).toHaveLength(2);

      const day9 = result.grouped!.find((g) => g.key === '2026-06-09');
      expect(day9?.costCents).toBe(30);
      expect(day9?.runs).toBe(2);

      const day10 = result.grouped!.find((g) => g.key === '2026-06-10');
      expect(day10?.costCents).toBe(30);
    });
  });

  describe('groupBy=model', () => {
    it('groups runs by model', async () => {
      mockPrisma.reviewRun.findMany.mockResolvedValue([
        makeRun({ model: 'claude-opus-4-8', costCents: 50 }),
        makeRun({ model: 'claude-sonnet-4-6', costCents: 20 }),
        makeRun({ model: 'claude-opus-4-8', costCents: 40 }),
      ]);

      const result = await controller.aggregate(undefined, undefined, 'model');
      expect(result.grouped).toHaveLength(2);

      const opus = result.grouped!.find((g) => g.key === 'claude-opus-4-8');
      expect(opus?.costCents).toBe(90);
      expect(opus?.runs).toBe(2);
    });
  });

  describe('groupBy=repo', () => {
    it('groups runs by repositoryId', async () => {
      mockPrisma.reviewRun.findMany.mockResolvedValue([
        makeRun({ repositoryId: 'repo-1', costCents: 30 }),
        makeRun({ repositoryId: 'repo-2', costCents: 70 }),
        makeRun({ repositoryId: 'repo-1', costCents: 20 }),
      ]);

      const result = await controller.aggregate(undefined, undefined, 'repo');
      const r1 = result.grouped!.find((g) => g.key === 'repo-1');
      expect(r1?.costCents).toBe(50);
    });
  });

  it('passes date filters to Prisma', async () => {
    mockPrisma.reviewRun.findMany.mockResolvedValue([]);
    await controller.aggregate('2026-06-01', '2026-06-30');

    expect(mockPrisma.reviewRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: new Date('2026-06-01'), lte: new Date('2026-06-30') }),
        }),
      }),
    );
  });
});
