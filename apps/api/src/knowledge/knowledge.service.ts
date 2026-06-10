import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  // Phase 3: load active packs for a repo in deterministic order (alphabetical slug)
  async getActivePacksText(_repositoryId: string): Promise<string> {
    return '';
  }
}
