import { PipelineEvent, PipelineStep } from '@pr-guard/shared';

const STEPS: PipelineStep[] = [
  'webhook_received',
  'queued',
  'diff_loaded',
  'reviewing_file',
  'comments_posted',
  'completed',
];

const STEP_LABELS: Record<PipelineStep, string> = {
  webhook_received: 'Webhook recebido',
  queued: 'Enfileirado',
  diff_loaded: 'Diff carregado',
  reviewing_file: 'Revisando arquivo',
  comments_posted: 'Comentários postados',
  completed: 'Concluído',
  failed: 'Falha',
};

interface Props {
  events: PipelineEvent[];
}

export default function PipelineView({ events }: Props) {
  const completedSteps = new Set(events.map((e) => e.step));

  return (
    <ol style={{ listStyle: 'none', padding: 0 }}>
      {STEPS.map((step) => {
        const done = completedSteps.has(step);
        return (
          <li key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{done ? '✅' : '⬜'}</span>
            <span style={{ color: done ? '#16a34a' : '#6b7280' }}>{STEP_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
