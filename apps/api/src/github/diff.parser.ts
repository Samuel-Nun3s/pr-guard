import { Injectable } from '@nestjs/common';

export interface FileDiff {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
}

@Injectable()
export class DiffParser {
  parse(files: Array<{ filename: string; patch?: string; additions: number; deletions: number }>): FileDiff[] {
    return files
      .filter((f) => f.patch)
      .map((f) => ({
        filename: f.filename,
        patch: f.patch!,
        additions: f.additions,
        deletions: f.deletions,
      }));
  }
}
