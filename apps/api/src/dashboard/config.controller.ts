import { Controller, Get, Post, Put, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../llm/crypto.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('config')
export class ConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // ── LLM Config ────────────────────────────────────────────────────────────

  @Get('llm')
  async getLlmConfig() {
    const config = await this.prisma.llmConfig.findFirst();
    if (!config) return null;
    return { ...config, encryptedKey: undefined, keyHint: '••••••••' };
  }

  @Post('llm')
  @HttpCode(200)
  async saveLlmConfig(
    @Body() body: { provider: string; model: string; apiKey: string; baseUrl?: string },
  ) {
    const encryptedKey = this.crypto.encrypt(body.apiKey);
    const baseUrl = body.baseUrl?.trim() || null;
    const existing = await this.prisma.llmConfig.findFirst();

    if (existing) {
      return this.prisma.llmConfig.update({
        where: { id: existing.id },
        data: { provider: body.provider, model: body.model, encryptedKey, baseUrl },
        select: { id: true, provider: true, model: true, baseUrl: true, updatedAt: true },
      });
    }

    return this.prisma.llmConfig.create({
      data: { provider: body.provider, model: body.model, encryptedKey, baseUrl },
      select: { id: true, provider: true, model: true, baseUrl: true, updatedAt: true },
    });
  }

  // ── Knowledge Packs ────────────────────────────────────────────────────────

  @Get('packs')
  getAllPacks() {
    return this.prisma.knowledgePack.findMany({ orderBy: { slug: 'asc' } });
  }

  @Get('repos/:repoId/packs')
  async getRepoPacks(@Param('repoId') repositoryId: string) {
    const [packs, repoPacks] = await Promise.all([
      this.prisma.knowledgePack.findMany({ orderBy: { slug: 'asc' } }),
      this.prisma.repoKnowledgePack.findMany({ where: { repositoryId } }),
    ]);

    const enabledSet = new Set(
      repoPacks.filter((rp) => rp.enabled).map((rp) => rp.packId),
    );

    return packs.map((pack) => ({ ...pack, enabled: enabledSet.has(pack.id) }));
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

  // ── Model Pricing ─────────────────────────────────────────────────────────

  @Get('pricing')
  getPricing() {
    return this.prisma.modelPricing.findMany({ orderBy: [{ provider: 'asc' }, { model: 'asc' }] });
  }

  @Put('pricing/:id')
  updatePricing(
    @Param('id') id: string,
    @Body() body: {
      inputPerMTok: number;
      outputPerMTok: number;
      cacheReadPerMTok: number;
      cacheWritePerMTok: number;
    },
  ) {
    return this.prisma.modelPricing.update({ where: { id }, data: body });
  }
}
