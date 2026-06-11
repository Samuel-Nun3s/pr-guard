import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('repos')
export class ReposController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    const repos = await this.prisma.repository.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const withStats = await Promise.all(
      repos.map(async (repo) => {
        const latestRun = await this.prisma.reviewRun.findFirst({
          where: { repositoryId: repo.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, prNumber: true, prTitle: true, createdAt: true },
        });
        return { ...repo, latestRun };
      }),
    );

    return withStats;
  }

  @Get(':id/runs')
  getRepoRuns(@Param('id') id: string) {
    return this.prisma.reviewRun.findMany({
      where: { repositoryId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
