import { PrReviewConfigParser } from '../pr-review-config.parser';

describe('PrReviewConfigParser', () => {
  const parser = new PrReviewConfigParser();

  describe('parse()', () => {
    it('returns defaults when raw is null', () => {
      const config = parser.parse(null);
      expect(config.ignoreFiles).toEqual([]);
      expect(config.minSeverity).toBe('suggestion');
    });

    it('parses a valid config correctly', () => {
      const raw = JSON.stringify({ ignoreFiles: ['*.test.ts', 'docs/**'], minSeverity: 'warning' });
      const config = parser.parse(raw);
      expect(config.ignoreFiles).toEqual(['*.test.ts', 'docs/**']);
      expect(config.minSeverity).toBe('warning');
    });

    it('returns defaults for invalid JSON', () => {
      const config = parser.parse('{not valid json}');
      expect(config.ignoreFiles).toEqual([]);
      expect(config.minSeverity).toBe('suggestion');
    });

    it('uses defaults for unrecognized minSeverity value', () => {
      const config = parser.parse(JSON.stringify({ minSeverity: 'critical' }));
      expect(config.minSeverity).toBe('suggestion');
    });

    it('filters out non-string values from ignoreFiles', () => {
      const config = parser.parse(JSON.stringify({ ignoreFiles: ['*.ts', 42, null, 'docs/**'] }));
      expect(config.ignoreFiles).toEqual(['*.ts', 'docs/**']);
    });

    it('defaults ignoreFiles to [] when missing from config', () => {
      const config = parser.parse(JSON.stringify({ minSeverity: 'error' }));
      expect(config.ignoreFiles).toEqual([]);
    });
  });

  describe('meetsSeverityThreshold()', () => {
    it('includes suggestion when minSeverity is suggestion', () => {
      expect(parser.meetsSeverityThreshold('suggestion', 'suggestion')).toBe(true);
    });

    it('includes warning when minSeverity is suggestion', () => {
      expect(parser.meetsSeverityThreshold('warning', 'suggestion')).toBe(true);
    });

    it('excludes suggestion when minSeverity is warning', () => {
      expect(parser.meetsSeverityThreshold('suggestion', 'warning')).toBe(false);
    });

    it('includes error when minSeverity is warning', () => {
      expect(parser.meetsSeverityThreshold('error', 'warning')).toBe(true);
    });

    it('only includes error when minSeverity is error', () => {
      expect(parser.meetsSeverityThreshold('warning', 'error')).toBe(false);
      expect(parser.meetsSeverityThreshold('suggestion', 'error')).toBe(false);
      expect(parser.meetsSeverityThreshold('error', 'error')).toBe(true);
    });
  });

  describe('shouldIgnoreFile()', () => {
    it('returns false when no patterns are provided', () => {
      expect(parser.shouldIgnoreFile('src/auth.ts', [])).toBe(false);
    });

    it('ignores files matching a simple glob pattern', () => {
      expect(parser.shouldIgnoreFile('auth.test.ts', ['*.test.ts'])).toBe(true);
    });

    it('does not ignore files not matching any pattern', () => {
      expect(parser.shouldIgnoreFile('src/auth.ts', ['*.test.ts'])).toBe(false);
    });

    it('ignores files in a directory using ** pattern', () => {
      expect(parser.shouldIgnoreFile('src/__tests__/auth.spec.ts', ['**/__tests__/**'])).toBe(true);
    });

    it('ignores files under a top-level folder using ** pattern', () => {
      expect(parser.shouldIgnoreFile('docs/architecture.md', ['docs/**'])).toBe(true);
    });

    it('matches any of multiple patterns', () => {
      const patterns = ['*.test.ts', 'docs/**'];
      expect(parser.shouldIgnoreFile('docs/setup.md', patterns)).toBe(true);
      expect(parser.shouldIgnoreFile('auth.test.ts', patterns)).toBe(true);
      expect(parser.shouldIgnoreFile('src/auth.ts', patterns)).toBe(false);
    });
  });
});
