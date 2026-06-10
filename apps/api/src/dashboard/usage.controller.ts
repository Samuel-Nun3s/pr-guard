import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async aggregate(
    @Query('from') from?: string,
    @Query('to') to?: string,
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
      },
    });

    const totals = runs.reduce(
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

    return { totals, detail: runs };
  }
}
