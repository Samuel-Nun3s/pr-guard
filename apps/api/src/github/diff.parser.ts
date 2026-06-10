import { Injectable } from '@nestjs/common';
import { PullRequestFile } from './github-api.service';

export interface FileDiff {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
  /** Map of new-file line numbers that appear in the diff (for inline comment positioning) */
  addedLines: Set<number>;
}

@Injectable()
export class DiffParser {
  parse(files: PullRequestFile[]): FileDiff[] {
    return files
      .filter((f) => f.patch && f.status !== 'removed')
      .map((f) => ({
        filename: f.filename,
        patch: f.patch!,
        additions: f.additions,
        deletions: f.deletions,
        addedLines: this.extractAddedLineNumbers(f.patch!),
      }));
  }

  /**
   * Parses the unified diff patch to build a set of line numbers (in the new file)
   * that were added or modified. Used to constrain inline comments to valid positions.
   */
  extractAddedLineNumbers(patch: string): Set<number> {
    const addedLines = new Set<number>();
    let currentNewLine = 0;

    for (const line of patch.split('\n')) {
      const hunkHeader = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkHeader) {
        currentNewLine = parseInt(hunkHeader[1], 10) - 1;
        continue;
      }

      if (line.startsWith('+')) {
        currentNewLine++;
        addedLines.add(currentNewLine);
      } else if (line.startsWith('-')) {
        // deleted line — does not advance new-file counter
      } else {
        // context line
        currentNewLine++;
      }
    }

    return addedLines;
  }

  /** Clamps a requested line number to the nearest valid added line in the diff */
  clampToValidLine(requestedLine: number, addedLines: Set<number>): number {
    if (addedLines.has(requestedLine)) return requestedLine;

    let closest = -1;
    let minDist = Infinity;
    for (const line of addedLines) {
      const dist = Math.abs(line - requestedLine);
      if (dist < minDist) {
        minDist = dist;
        closest = line;
      }
    }

    return closest > 0 ? closest : requestedLine;
  }
}
