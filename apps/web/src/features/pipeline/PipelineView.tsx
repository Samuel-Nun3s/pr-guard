const STEPS = [
  { key: 'queued',           label: 'Queued' },
  { key: 'diff_loaded',      label: 'Diff loaded' },
  { key: 'reviewing_file',   label: 'Reviewing files' },
  { key: 'comments_posted',  label: 'Comments posted' },
  { key: 'completed',        label: 'Completed' },
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
  const reviewingEvent = events.findLast?.((e: Event) => e.step === 'reviewing_file');

  return (
    <ol className="flex flex-col gap-2">
      {STEPS.map((step, idx) => {
        const done     = completedSteps.has(step.key);
        const isActive = !done && status === 'RUNNING' && isPreviousDone(step.key, completedSteps);
        const isFailed = failed && isLastPending(step.key, completedSteps);

        return (
          <li key={step.key} className="flex items-start gap-3">
            {/* Connector line */}
            <div className="flex flex-col items-center">
              <StepDot done={done} active={isActive} failed={isFailed} />
              {idx < STEPS.length - 1 && (
                <div className={`w-px h-5 mt-0.5 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>

            <div className="pb-2">
              <span className={`text-sm font-medium ${
                done     ? 'text-green-700' :
                isFailed ? 'text-red-600' :
                isActive ? 'text-blue-600' :
                           'text-gray-400'
              }`}>
                {step.label}
              </span>

              {step.key === 'reviewing_file' && reviewingEvent?.payload && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {String(reviewingEvent.payload['file'])}
                  <span className="ml-1 text-gray-300">
                    ({String(reviewingEvent.payload['index'])}/{String(reviewingEvent.payload['total'])})
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ done, active, failed }: { done: boolean; active: boolean; failed: boolean }) {
  if (done)   return <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>;
  if (failed) return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">✕</div>;
  if (active) return <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse" />;
  return <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-white" />;
}

function isPreviousDone(key: StepKey, done: Set<string>): boolean {
  const idx = STEPS.findIndex((s) => s.key === key);
  if (idx === 0) return true;
  return done.has(STEPS[idx - 1].key);
}

function isLastPending(key: StepKey, done: Set<string>): boolean {
  return !done.has(key) && STEPS.slice(STEPS.findIndex((s) => s.key === key) + 1).every((s) => !done.has(s.key));
}
