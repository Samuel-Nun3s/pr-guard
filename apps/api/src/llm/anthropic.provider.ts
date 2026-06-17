import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, FileReview } from './llm-provider.interface';

const FILE_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['error', 'warning', 'suggestion'] },
          body: { type: 'string' },
        },
        required: ['line', 'severity', 'body'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['comments', 'summary'],
  additionalProperties: false,
};

export class AnthropicProvider implements LlmProvider {
  private readonly client: Anthropic;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async reviewFile(filename: string, diff: string, packs: string): Promise<FileReview> {
    const systemText = packs
      ? `You are a senior code reviewer. Be concise: each comment body must be 1–2 sentences max. Flag only real issues — skip style nitpicks unless they cause bugs.\n\n${packs}`
      : 'You are a senior code reviewer. Be concise: each comment body must be 1–2 sentences max. Flag only real issues — skip style nitpicks unless they cause bugs.';

    const response = await (this.client.messages.create as Function)({
      model: this.model,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: systemText,
          // Cache the system prompt (persona + packs) across all files in the same PR.
          // Packs must be in deterministic order for the cache prefix to match (~90% token savings).
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `File: ${filename}\n\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          name: 'file_review',
          strict: true,
          schema: FILE_REVIEW_SCHEMA,
        },
      },
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
    const parsed = JSON.parse((textBlock as { text: string }).text) as {
      comments: Array<{ line: number; severity: 'error' | 'warning' | 'suggestion'; body: string }>;
      summary: string;
    };

    const usage = response.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };

    return {
      comments: parsed.comments,
      summary: parsed.summary,
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      },
    };
  }
}
