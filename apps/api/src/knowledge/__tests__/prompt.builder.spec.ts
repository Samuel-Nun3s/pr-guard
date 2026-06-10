import { PromptBuilder } from '../prompt.builder';

describe('PromptBuilder', () => {
  const builder = new PromptBuilder();

  it('returns empty string when no packs provided', () => {
    expect(builder.build([], [])).toBe('');
  });

  it('includes the pack slug as a header', () => {
    const result = builder.build(['clean-code'], ['## Nomes\n- Use nomes descritivos']);
    expect(result).toContain('## Knowledge Pack: clean-code');
  });

  it('includes the pack content', () => {
    const result = builder.build(['refactoring'], ['## DRY\n- Evite duplicação']);
    expect(result).toContain('## DRY');
    expect(result).toContain('Evite duplicação');
  });

  it('assembles multiple packs with a separator', () => {
    const result = builder.build(
      ['clean-code', 'refactoring'],
      ['Conteúdo A', 'Conteúdo B'],
    );
    expect(result).toContain('Knowledge Pack: clean-code');
    expect(result).toContain('Knowledge Pack: refactoring');
    expect(result).toContain('---');
  });

  it('preserves the order of slugs (caller is responsible for alphabetical sort)', () => {
    const result = builder.build(
      ['refactoring', 'clean-code'],
      ['Conteúdo R', 'Conteúdo C'],
    );
    const posR = result.indexOf('Knowledge Pack: refactoring');
    const posC = result.indexOf('Knowledge Pack: clean-code');
    expect(posR).toBeLessThan(posC);
  });

  it('wraps output in a Review Guidelines header', () => {
    const result = builder.build(['pack'], ['content']);
    expect(result).toContain('# Review Guidelines');
  });

  it('trims whitespace from pack content', () => {
    const result = builder.build(['pack'], ['  \n  trimmed content  \n  ']);
    expect(result).toContain('trimmed content');
    expect(result).not.toContain('  \n  trimmed content  \n  ');
  });
});
