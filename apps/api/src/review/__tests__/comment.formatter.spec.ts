import { DiffParser } from '../../github/diff.parser';
import { CommentFormatter } from '../comment.formatter';

describe('CommentFormatter', () => {
  const diffParser = new DiffParser();
  const formatter = new CommentFormatter(diffParser);

  const addedLines = new Set([1, 2, 5, 10, 15]);

  it('formats an error comment with the correct label', () => {
    const result = formatter.format('src/auth.ts', [{ line: 5, severity: 'error', body: 'SQL injection risk' }], addedLines);
    expect(result[0].body).toContain('🔴 Error');
    expect(result[0].body).toContain('SQL injection risk');
  });

  it('formats a warning comment', () => {
    const result = formatter.format('src/auth.ts', [{ line: 5, severity: 'warning', body: 'Use const' }], addedLines);
    expect(result[0].body).toContain('🟡 Warning');
  });

  it('formats a suggestion comment', () => {
    const result = formatter.format('src/auth.ts', [{ line: 5, severity: 'suggestion', body: 'Extract method' }], addedLines);
    expect(result[0].body).toContain('🔵 Suggestion');
  });

  it('sets the correct file path', () => {
    const result = formatter.format('src/utils/helper.ts', [{ line: 2, severity: 'suggestion', body: 'ok' }], addedLines);
    expect(result[0].path).toBe('src/utils/helper.ts');
  });

  it('clamps a comment line to the nearest valid diff line', () => {
    // line 7 is not in addedLines — nearest is 5 or 10; DiffParser picks 5 (dist=2) over 10 (dist=3)
    const result = formatter.format('file.ts', [{ line: 7, severity: 'warning', body: 'x' }], addedLines);
    expect(result[0].line).toBe(5);
  });

  it('keeps the line unchanged when it is a valid diff line', () => {
    const result = formatter.format('file.ts', [{ line: 10, severity: 'error', body: 'y' }], addedLines);
    expect(result[0].line).toBe(10);
  });

  it('returns one FormattedComment per input comment', () => {
    const comments = [
      { line: 1, severity: 'error' as const, body: 'a' },
      { line: 2, severity: 'warning' as const, body: 'b' },
      { line: 5, severity: 'suggestion' as const, body: 'c' },
    ];
    expect(formatter.format('x.ts', comments, addedLines)).toHaveLength(3);
  });

  it('returns empty array for no comments', () => {
    expect(formatter.format('x.ts', [], addedLines)).toEqual([]);
  });
});
