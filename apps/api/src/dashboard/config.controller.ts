import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../llm/crypto.service';
import { AuthGuard } from '../auth/auth.guard';

const LLM_SELECT = { id: true, label: true, provider: true, model: true, baseUrl: true, active: true, createdAt: true, updatedAt: true } as const;

@UseGuards(AuthGuard)
@Controller('config')
export class ConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // ── LLM Config ────────────────────────────────────────────────────────────

  @Get('llm')
  async getLlmConfigs() {
    const configs = await this.prisma.llmConfig.findMany({
      orderBy: { createdAt: 'asc' },
      select: { ...LLM_SELECT, encryptedKey: true },
    });
    return configs.map(({ encryptedKey, ...rest }) => ({
      ...rest,
      keyHint: `••••${encryptedKey.slice(-4)}`,
    }));
  }

  @Post('llm')
  @HttpCode(200)
  async createLlmConfig(
    @Body() body: { label?: string; provider: string; model: string; apiKey: string; baseUrl?: string },
  ) {
    const encryptedKey = this.crypto.encrypt(body.apiKey);
    const baseUrl = body.baseUrl?.trim() || null;
    const label = body.label?.trim() || '';

    const hasActive = await this.prisma.llmConfig.count({ where: { active: true } });

    return this.prisma.llmConfig.create({
      data: { label, provider: body.provider, model: body.model, encryptedKey, baseUrl, active: hasActive === 0 },
      select: LLM_SELECT,
    });
  }

  @Put('llm/:id')
  async updateLlmConfig(
    @Param('id') id: string,
    @Body() body: { label?: string; provider?: string; model?: string; apiKey?: string; baseUrl?: string },
  ) {
    const existing = await this.prisma.llmConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    const encryptedKey = body.apiKey ? this.crypto.encrypt(body.apiKey) : existing.encryptedKey;

    return this.prisma.llmConfig.update({
      where: { id },
      data: {
        label:    body.label?.trim() ?? existing.label,
        provider: body.provider     ?? existing.provider,
        model:    body.model        ?? existing.model,
        baseUrl:  'baseUrl' in body ? (body.baseUrl?.trim() || null) : existing.baseUrl,
        encryptedKey,
      },
      select: LLM_SELECT,
    });
  }

  @Put('llm/:id/activate')
  @HttpCode(200)
  async activateLlmConfig(@Param('id') id: string) {
    const exists = await this.prisma.llmConfig.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();

    await this.prisma.llmConfig.updateMany({ data: { active: false } });
    return this.prisma.llmConfig.update({ where: { id }, data: { active: true }, select: LLM_SELECT });
  }

  @Delete('llm/:id')
  @HttpCode(200)
  async deleteLlmConfig(@Param('id') id: string) {
    const existing = await this.prisma.llmConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    await this.prisma.llmConfig.delete({ where: { id } });

    // Auto-activate the most recent remaining config if the deleted one was active
    if (existing.active) {
      const next = await this.prisma.llmConfig.findFirst({ orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.llmConfig.update({ where: { id: next.id }, data: { active: true } });
    }

    return { ok: true };
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
