export type Severity = 'error' | 'warning' | 'suggestion';

export interface ReviewComment {
  id: string;
  runId: string;
  path: string;
  line: number;
  severity: Severity;
  body: string;
}

export type ReviewStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ReviewRun {
  id: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  status: ReviewStatus;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  createdAt: string;
}
