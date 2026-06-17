import { ConfigService } from '@nestjs/config';
import { KnowledgeService } from '../knowledge.service';
import { PromptBuilder } from '../prompt.builder';
import { PrismaService } from '../../prisma/prisma.service';

// Mock the fs module — no real files touched in unit tests
// existsSync is needed by Prisma client at module-load time
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn(),
  },
}));

import { promises as fs } from 'fs';

const mockPrisma = {
  repoKnowledgePack: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

const mockConfig = {
  get: jest.fn().mockReturnValue('/test/knowledge'),
} as unknown as ConfigService;

function makeService() {
  return new KnowledgeService(mockPrisma, new PromptBuilder(), mockConfig);
}

describe('KnowledgeService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty string when no packs are active', async () => {
    (mockPrisma.repoKnowledgePack.findMany as jest.Mock).mockResolvedValue([]);
    const svc = makeService();
    expect(await svc.getActivePacksText('repo-1')).toBe('');
  });

  it('loads active packs and assembles them via PromptBuilder', async () => {
    (mockPrisma.repoKnowledgePack.findMany as jest.Mock).mockResolvedValue([
      { pack: { slug: 'clean-code', filePath: 'knowledge/packs/clean-code.md' } },
    ]);
    (fs.readFile as jest.Mock).mockResolvedValue('## Nomes\n- Use descritivos');

    const svc = makeService();
    const result = await svc.getActivePacksText('repo-1');

    expect(result).toContain('clean-code');
    expect(result).toContain('## Nomes');
  });

  it('queries packs ordered by slug for deterministic cache prefix', async () => {
    (mockPrisma.repoKnowledgePack.findMany as jest.Mock).mockResolvedValue([]);
    const svc = makeService();
    await svc.getActivePacksText('repo-1');

    expect(mockPrisma.repoKnowledgePack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { pack: { slug: 'asc' } },
      }),
    );
  });

  it('skips a pack whose file cannot be read and continues with the rest', async () => {
    (mockPrisma.repoKnowledgePack.findMany as jest.Mock).mockResolvedValue([
      { pack: { slug: 'missing-pack', filePath: 'knowledge/packs/missing.md' } },
      { pack: { slug: 'refactoring', filePath: 'knowledge/packs/refactoring.md' } },
    ]);
    (fs.readFile as jest.Mock)
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce('## DRY\n- Evite duplicação');

    const svc = makeService();
    const result = await svc.getActivePacksText('repo-1');

    expect(result).toContain('refactoring');
    expect(result).not.toContain('missing-pack');
  });

  it('returns empty string when all pack files fail to load', async () => {
    (mockPrisma.repoKnowledgePack.findMany as jest.Mock).mockResolvedValue([
      { pack: { slug: 'bad-pack', filePath: 'knowledge/packs/bad.md' } },
    ]);
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const svc = makeService();
    expect(await svc.getActivePacksText('repo-1')).toBe('');
  });
});
