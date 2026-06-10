import { DiffParser } from '../diff.parser';
import { PullRequestFile } from '../github-api.service';

describe('DiffParser', () => {
  const parser = new DiffParser();

  describe('parse()', () => {
    it('filters out files without a patch', () => {
      const files: PullRequestFile[] = [
        { filename: 'binary.png', additions: 0, deletions: 0, status: 'added' },
        { filename: 'readme.md', patch: '@@ -1,3 +1,4 @@\n context\n+new line\n context\n context', additions: 1, deletions: 0, status: 'modified' },
      ];
      const result = parser.parse(files);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('readme.md');
    });

    it('filters out removed files', () => {
      const files: PullRequestFile[] = [
        { filename: 'deleted.ts', patch: '@@ -1,3 +0,0 @@\n-line1\n-line2\n-line3', additions: 0, deletions: 3, status: 'removed' },
      ];
      expect(parser.parse(files)).toHaveLength(0);
    });

    it('parses multiple files correctly', () => {
      const files: PullRequestFile[] = [
        { filename: 'a.ts', patch: '@@ -1,2 +1,3 @@\n context\n+new\n context', additions: 1, deletions: 0, status: 'modified' },
        { filename: 'b.ts', patch: '@@ -5,2 +5,2 @@\n-old\n+new', additions: 1, deletions: 1, status: 'modified' },
      ];
      const result = parser.parse(files);
      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('a.ts');
      expect(result[1].filename).toBe('b.ts');
    });
  });

  describe('extractAddedLineNumbers()', () => {
    it('returns line numbers of added lines', () => {
      // hunk starts at new-file line 1
      const patch = '@@ -1,2 +1,3 @@\n context\n+added line\n context';
      const lines = parser.extractAddedLineNumbers(patch);
      expect(lines.has(2)).toBe(true); // "added line" is at new-file line 2
    });

    it('handles multiple hunks', () => {
      const patch =
        '@@ -1,2 +1,3 @@\n context\n+added at 2\n context\n' +
        '@@ -10,2 +11,3 @@\n context\n+added at 12\n context';
      const lines = parser.extractAddedLineNumbers(patch);
      expect(lines.has(2)).toBe(true);
      expect(lines.has(12)).toBe(true);
    });

    it('does not include deleted lines', () => {
      const patch = '@@ -1,3 +1,2 @@\n context\n-deleted line\n context';
      const lines = parser.extractAddedLineNumbers(patch);
      expect(lines.size).toBe(0); // only context lines, no additions
    });
  });

  describe('clampToValidLine()', () => {
    it('returns the line when it is valid', () => {
      const lines = new Set([1, 2, 5, 10]);
      expect(parser.clampToValidLine(5, lines)).toBe(5);
    });

    it('returns the nearest valid line when requested is not in diff', () => {
      const lines = new Set([1, 2, 10]);
      expect(parser.clampToValidLine(8, lines)).toBe(10);
    });

    it('returns original when set is empty', () => {
      expect(parser.clampToValidLine(7, new Set())).toBe(7);
    });
  });
});
