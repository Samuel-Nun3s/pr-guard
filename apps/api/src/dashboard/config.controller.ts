import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('llm')
  getLlmConfig() {
    return this.prisma.llmConfig.findFirst();
  }

  @Get('packs')
  getPacks() {
    return this.prisma.knowledgePack.findMany();
  }

  @Put('repos/:repoId/packs/:packId')
  togglePack(
    @Param('repoId') repositoryId: string,
    @Param('packId') packId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.prisma.repoKnowledgePack.upsert({
      where: { repositoryId_packId: { repositoryId, packId } },
      update: { enabled },
      create: { repositoryId, packId, enabled },
    });
  }
}
