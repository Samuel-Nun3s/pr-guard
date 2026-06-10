import { LlmProvider, FileReview } from './llm-provider.interface';

interface OpenAiUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface OpenAiResponse {
  choices: Array<{ message: { content: string } }>;
  usage: OpenAiUsage;
}

export class OpenAiProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async reviewFile(filename: string, diff: string, packs: string): Promise<FileReview> {
    const systemText = packs
      ? `You are a senior code reviewer.\n\n${packs}`
      : 'You are a senior code reviewer.';

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemText },
        {
          role: 'user',
          content: [
            `File: ${filename}`,
            `\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
            '\nReturn a JSON object with this exact shape: {"comments":[{"line":integer,"severity":"error"|"warning"|"suggestion","body":"string"}],"summary":"string"}',
          ].join(''),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as OpenAiResponse;
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content) as {
      comments: Array<{ line: number; severity: 'error' | 'warning' | 'suggestion'; body: string }>;
      summary: string;
    };

    return {
      comments: parsed.comments ?? [],
      summary: parsed.summary ?? '',
      // OpenAI doesn't support prompt caching — map to zero cache tokens
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
    };
  }
}
