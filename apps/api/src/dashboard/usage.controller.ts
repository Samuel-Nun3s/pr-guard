import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';

type GroupBy = 'day' | 'repo' | 'model';

interface RunRecord {
  repositoryId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  createdAt: Date;
}

@UseGuards(AuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async aggregate(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ) {
    const where = {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    };

    const runs = await this.prisma.reviewRun.findMany({
      where,
      select: {
        repositoryId: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheCreationTokens: true,
        costCents: true,
        createdAt: true,
        repository: { select: { owner: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totals = this.sumRuns(runs as RunRecord[]);
    const grouped = groupBy ? this.group(runs as RunRecord[], groupBy) : undefined;

    return { totals, grouped, detail: runs };
  }

  private sumRuns(runs: RunRecord[]) {
    return runs.reduce(
      (acc, r) => ({
        inputTokens: acc.inputTokens + r.inputTokens,
        outputTokens: acc.outputTokens + r.outputTokens,
        cacheReadTokens: acc.cacheReadTokens + r.cacheReadTokens,
        cacheCreationTokens: acc.cacheCreationTokens + r.cacheCreationTokens,
        costCents: acc.costCents + r.costCents,
        runs: acc.runs + 1,
      }),
      { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costCents: 0, runs: 0 },
    );
  }

  private group(runs: RunRecord[], groupBy: GroupBy) {
    const buckets = new Map<string, ReturnType<typeof this.sumRuns> & { key: string }>();

    for (const run of runs) {
      const key =
        groupBy === 'day'
          ? run.createdAt.toISOString().slice(0, 10)
          : groupBy === 'repo'
          ? run.repositoryId
          : run.model;

      const existing = buckets.get(key);
      if (existing) {
        existing.inputTokens += run.inputTokens;
        existing.outputTokens += run.outputTokens;
        existing.cacheReadTokens += run.cacheReadTokens;
        existing.cacheCreationTokens += run.cacheCreationTokens;
        existing.costCents += run.costCents;
        existing.runs += 1;
      } else {
        buckets.set(key, { key, ...this.sumRuns([run]) });
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  }
}
