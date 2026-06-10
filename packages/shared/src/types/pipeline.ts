export type PipelineStep =
  | 'webhook_received'
  | 'queued'
  | 'diff_loaded'
  | 'reviewing_file'
  | 'comments_posted'
  | 'completed'
  | 'failed';

export interface PipelineEvent {
  id: string;
  runId: string;
  step: PipelineStep;
  payload: Record<string, unknown>;
  createdAt: string;
}
