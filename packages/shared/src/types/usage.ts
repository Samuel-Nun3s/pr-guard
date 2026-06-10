export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  runs: number;
}

export interface UsageResponse {
  totals: UsageTotals;
  detail: Array<{
    repositoryId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    costCents: number;
    createdAt: string;
  }>;
}
