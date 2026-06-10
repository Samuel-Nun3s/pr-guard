import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PromptBuilder } from './prompt.builder';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly knowledgeRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptBuilder: PromptBuilder,
    private readonly config: ConfigService,
  ) {
    // KNOWLEDGE_ROOT defaults to <monorepo-root>/knowledge when running from apps/api/
    this.knowledgeRoot = this.config.get<string>(
      'KNOWLEDGE_ROOT',
      path.resolve(process.cwd(), '..', '..', 'knowledge'),
    );
  }

  /**
   * Loads active knowledge packs for the given repository and assembles them
   * into a single system prompt section. Packs are sorted alphabetically by slug
   * so the Anthropic prompt cache prefix is stable across all files in the same PR.
   */
  async getActivePacksText(repositoryId: string): Promise<string> {
    type RepoPack = { pack: { slug: string; filePath: string } };

    const repoPacks = (await this.prisma.repoKnowledgePack.findMany({
      where: { repositoryId, enabled: true },
      include: { pack: true },
      orderBy: { pack: { slug: 'asc' } },
    })) as RepoPack[];

    if (repoPacks.length === 0) return '';

    const contents = await Promise.all(
      repoPacks.map((rp: RepoPack) => this.readPackFile(rp.pack.filePath)),
    );

    const activePacks = repoPacks
      .map((rp: RepoPack, i: number) => ({ slug: rp.pack.slug, content: contents[i] }))
      .filter((p: { slug: string; content: string | null }): p is { slug: string; content: string } =>
        p.content !== null,
      );

    if (activePacks.length === 0) return '';

    return this.promptBuilder.build(
      activePacks.map((p) => p.slug),
      activePacks.map((p) => p.content),
    );
  }

  private async readPackFile(filePath: string): Promise<string | null> {
    const fullPath = path.join(this.knowledgeRoot, 'packs', path.basename(filePath));
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      this.logger.warn(`Knowledge pack file not found: ${fullPath}`);
      return null;
    }
  }
}
