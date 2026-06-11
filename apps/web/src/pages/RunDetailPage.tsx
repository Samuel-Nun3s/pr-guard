import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, RunDetail } from '../lib/api';
import PipelineView from '../features/pipeline/PipelineView';

const SEVERITY_STYLES = {
  error:      'bg-red-50 border-red-200 text-red-700',
  warning:    'bg-yellow-50 border-yellow-200 text-yellow-700',
  suggestion: 'bg-blue-50 border-blue-200 text-blue-700',
};

const SEVERITY_BADGE = {
  error:      'bg-red-100 text-red-700',
  warning:    'bg-yellow-100 text-yellow-700',
  suggestion: 'bg-blue-100 text-blue-700',
};

const SEVERITY_ICON = { error: '🔴', warning: '🟡', suggestion: '🔵' };

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  RUNNING:   'bg-blue-100 text-blue-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
};

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [events, setEvents] = useState<Array<{ step: string; payload: Record<string, unknown> }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.runs.get(id).then((r) => { setRun(r); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`/api/runs/${id}/events`);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data) as { step: string; payload: Record<string, unknown> };
      setEvents((prev) => [...prev, event]);
      if (event.step === 'completed' || event.step === 'failed') {
        es.close();
        api.runs.get(id).then(setRun);
      }
    };
    return () => es.close();
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (!run) return <p className="text-gray-500">Run not found.</p>;

  const comments = run.comments ?? [];
  const errorCount   = comments.filter((c) => c.severity === 'error').length;
  const warningCount = comments.filter((c) => c.severity === 'warning').length;
  const suggCount    = comments.filter((c) => c.severity === 'suggestion').length;

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/" className="hover:text-gray-600">Repositories</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">
              {run.repository?.owner}/{run.repository?.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Review Run</h1>
          <p className="text-sm text-gray-400 mt-1">{new Date(run.createdAt).toLocaleString()}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {run.status}
        </span>
      </div>

      {/* Pipeline */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Pipeline</h2>
        <PipelineView events={events} status={run.status} />
      </section>

      {/* Stats */}
      {(run.inputTokens || run.costCents) ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Input tokens"  value={run.inputTokens?.toLocaleString() ?? '—'} />
          <StatCard label="Output tokens" value={run.outputTokens?.toLocaleString() ?? '—'} />
          <StatCard label="Cache read"    value={run.cacheReadTokens?.toLocaleString() ?? '—'} />
          <StatCard label="Cost"          value={run.costCents ? `$${(run.costCents / 100).toFixed(4)}` : '—'} highlight />
        </div>
      ) : null}

      {/* Comment summary bar */}
      {comments.length > 0 && (
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-medium text-gray-700">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
          {errorCount   > 0 && <Badge cls="bg-red-100 text-red-700">{errorCount} error{errorCount !== 1 ? 's' : ''}</Badge>}
          {warningCount > 0 && <Badge cls="bg-yellow-100 text-yellow-700">{warningCount} warning{warningCount !== 1 ? 's' : ''}</Badge>}
          {suggCount    > 0 && <Badge cls="bg-blue-100 text-blue-700">{suggCount} suggestion{suggCount !== 1 ? 's' : ''}</Badge>}
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`border rounded-xl p-4 ${SEVERITY_STYLES[c.severity as keyof typeof SEVERITY_STYLES] ?? 'bg-gray-50 border-gray-200'}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <code className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded">{c.path}:{c.line}</code>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[c.severity as keyof typeof SEVERITY_BADGE] ?? 'bg-gray-100 text-gray-600'}`}>
                  {SEVERITY_ICON[c.severity as keyof typeof SEVERITY_ICON]} {c.severity}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      ) : run.status === 'COMPLETED' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="font-semibold text-green-700">No issues found</p>
          <p className="text-sm text-green-600 mt-1">The review completed with no comments.</p>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}

function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="bg-white border border-gray-200 rounded-xl p-5 h-32" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-20" />)}
      </div>
    </div>
  );
}
