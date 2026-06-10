import { Injectable, Logger } from '@nestjs/common';

export type MinSeverity = 'error' | 'warning' | 'suggestion';

export interface PrReviewConfig {
  ignoreFiles: string[];
  minSeverity: MinSeverity;
}

const SEVERITY_RANK: Record<MinSeverity, number> = {
  suggestion: 0,
  warning: 1,
  error: 2,
};

const DEFAULTS: PrReviewConfig = {
  ignoreFiles: [],
  minSeverity: 'suggestion',
};

@Injectable()
export class PrReviewConfigParser {
  private readonly logger = new Logger(PrReviewConfigParser.name);

  parse(raw: string | null): PrReviewConfig {
    if (!raw) return { ...DEFAULTS };

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        ignoreFiles: Array.isArray(parsed['ignoreFiles'])
          ? (parsed['ignoreFiles'] as string[]).filter((s) => typeof s === 'string')
          : DEFAULTS.ignoreFiles,
        minSeverity: this.parseSeverity(parsed['minSeverity']),
      };
    } catch {
      this.logger.warn('.prreview.json is not valid JSON — using defaults');
      return { ...DEFAULTS };
    }
  }

  private parseSeverity(value: unknown): MinSeverity {
    if (value === 'error' || value === 'warning' || value === 'suggestion') return value;
    return DEFAULTS.minSeverity;
  }

  /** Returns true if the comment severity meets the configured minimum threshold. */
  meetsSeverityThreshold(severity: MinSeverity, minSeverity: MinSeverity): boolean {
    return SEVERITY_RANK[severity] >= SEVERITY_RANK[minSeverity];
  }

  /** Returns true if the filename matches any of the ignore glob patterns. */
  shouldIgnoreFile(filename: string, patterns: string[]): boolean {
    return patterns.some((pattern) => this.matchGlob(filename, pattern));
  }

  private matchGlob(filename: string, pattern: string): boolean {
    // Converts glob syntax to regex:
    //   **  → matches any sequence of characters including /
    //   *   → matches any sequence except /
    const regexStr =
      '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials (not *)
        .replace(/\*\*/g, '\x00')              // temp-mark ** before handling *
        .replace(/\*/g, '[^/]+')               // * → any non-separator chars
        .replace(/\x00/g, '.+') +              // ** → any chars (incl. /)
      '$';

    return new RegExp(regexStr).test(filename);
  }
}
