const STEPS = [
  { key: 'queued', label: 'Enfileirado' },
  { key: 'diff_loaded', label: 'Diff carregado' },
  { key: 'reviewing_file', label: 'Revisando arquivos' },
  { key: 'comments_posted', label: 'Comentários postados' },
  { key: 'completed', label: 'Concluído' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

interface Event {
  step: string;
  payload?: Record<string, unknown>;
}

interface Props {
  events: Event[];
  status?: string;
}

export default function PipelineView({ events, status }: Props) {
  const completedSteps = new Set(events.map((e) => e.step as StepKey));
  const failed = status === 'FAILED' || completedSteps.has('failed' as StepKey);

  const reviewingEvent = events.findLast?.((e) => e.step === 'reviewing_file');

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {STEPS.map((step) => {
        const done = completedSteps.has(step.key);
        const isActive = !done && status === 'RUNNING' && isPreviousDone(step.key, completedSteps);

        return (
          <li key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18, minWidth: 22, textAlign: 'center' }}>
              {done ? '✅' : failed && isLastPending(step.key, completedSteps) ? '❌' : isActive ? '⏳' : '⬜'}
            </span>
            <div>
              <span style={{ color: done ? '#16a34a' : isActive ? '#2563eb' : '#6b7280', fontWeight: done || isActive ? 600 : 400 }}>
                {step.label}
              </span>
              {step.key === 'reviewing_file' && reviewingEvent?.payload && (
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {String(reviewingEvent.payload['file'])} ({String(reviewingEvent.payload['index'])}/{String(reviewingEvent.payload['total'])})
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function isPreviousDone(key: StepKey, done: Set<string>): boolean {
  const idx = STEPS.findIndex((s) => s.key === key);
  if (idx === 0) return true;
  return done.has(STEPS[idx - 1].key);
}

function isLastPending(key: StepKey, done: Set<string>): boolean {
  return !done.has(key) && STEPS.slice(STEPS.findIndex((s) => s.key === key) + 1).every((s) => !done.has(s.key));
}
