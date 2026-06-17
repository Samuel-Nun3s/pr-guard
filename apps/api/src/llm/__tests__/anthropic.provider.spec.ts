import { AnthropicProvider } from '../anthropic.provider';

// Mock the Anthropic SDK — never makes real API calls
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

import Anthropic from '@anthropic-ai/sdk';

function makeReview(overrides: Partial<{
  comments: Array<{ line: number; severity: string; body: string }>;
  summary: string;
  usage: object;
}> = {}) {
  return {
    content: [{ type: 'text', text: JSON.stringify({
      comments: overrides.comments ?? [{ line: 5, severity: 'warning', body: 'Use const' }],
      summary: overrides.summary ?? 'Looks good overall',
    }) }],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 300,
      ...(overrides.usage ?? {}),
    },
  };
}

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new AnthropicProvider('sk-test', 'claude-opus-4-8');
    const instance = (Anthropic as unknown as jest.Mock).mock.results[0].value;
    mockCreate = instance.messages.create;
  });

  it('returns parsed comments and summary', async () => {
    mockCreate.mockResolvedValue(makeReview());
    const result = await provider.reviewFile('src/index.ts', '@@ -1 +1 @@\n+const x = 1', '');

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]).toEqual({ line: 5, severity: 'warning', body: 'Use const' });
    expect(result.summary).toBe('Looks good overall');
  });

  it('maps Anthropic usage fields to TokenUsage', async () => {
    mockCreate.mockResolvedValue(makeReview());
    const result = await provider.reviewFile('a.ts', 'diff', '');

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 200,
      cacheCreationTokens: 300,
    });
  });

  it('defaults cache tokens to 0 when not present in response', async () => {
    const response = makeReview();
    (response as { usage: object }).usage = { input_tokens: 10, output_tokens: 5 };
    mockCreate.mockResolvedValue(response);

    const result = await provider.reviewFile('b.ts', 'diff', '');
    expect(result.usage.cacheReadTokens).toBe(0);
    expect(result.usage.cacheCreationTokens).toBe(0);
  });

  it('includes knowledge packs in system prompt when provided', async () => {
    mockCreate.mockResolvedValue(makeReview());
    await provider.reviewFile('c.ts', 'diff', '## Clean Code\n- Use descriptive names');

    const call = mockCreate.mock.calls[0][0];
    expect(call.system[0].text).toContain('## Clean Code');
  });

  it('omits packs section from system prompt when empty', async () => {
    mockCreate.mockResolvedValue(makeReview());
    await provider.reviewFile('d.ts', 'diff', '');

    const call = mockCreate.mock.calls[0][0];
    expect(call.system[0].text).toContain('You are a senior code reviewer.');
  });

  it('passes cache_control ephemeral on the system prompt block', async () => {
    mockCreate.mockResolvedValue(makeReview());
    await provider.reviewFile('e.ts', 'diff', '');

    const call = mockCreate.mock.calls[0][0];
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('uses output_config with json_schema format', async () => {
    mockCreate.mockResolvedValue(makeReview());
    await provider.reviewFile('f.ts', 'diff', '');

    const call = mockCreate.mock.calls[0][0];
    expect(call.output_config.format.type).toBe('json_schema');
    expect(call.output_config.format.schema.required).toContain('comments');
    expect(call.output_config.format.schema.required).toContain('summary');
  });
});
