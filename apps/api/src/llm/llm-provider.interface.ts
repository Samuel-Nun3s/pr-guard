export interface FileReview {
  comments: Array<{
    line: number;
    severity: 'error' | 'warning' | 'suggestion';
    body: string;
  }>;
  summary: string;
  usage: TokenUsage;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface LlmProvider {
  reviewFile(filename: string, diff: string, packs: string): Promise<FileReview>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
