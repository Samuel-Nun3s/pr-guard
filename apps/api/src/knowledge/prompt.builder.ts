import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilder {
  /**
   * Assembles knowledge pack contents into a single system prompt section.
   * Packs MUST arrive in deterministic (alphabetical slug) order so that
   * Anthropic's prompt cache prefix matches across all files in the same PR.
   */
  build(slugs: string[], contents: string[]): string {
    if (contents.length === 0) return '';

    const sections = contents.map(
      (content, i) => `## Knowledge Pack: ${slugs[i]}\n\n${content.trim()}`,
    );

    return `# Review Guidelines\n\nApply the following principles when reviewing code:\n\n${sections.join('\n\n---\n\n')}`;
  }
}
