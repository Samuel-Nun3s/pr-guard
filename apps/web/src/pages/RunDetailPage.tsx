import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, RunDetail } from '../lib/api';
import PipelineView from '../features/pipeline/PipelineView';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [events, setEvents] = useState<Array<{ step: string; payload: Record<string, unknown> }>>([]);

  useEffect(() => {
    if (!id) return;
    api.runs.get(id).then(setRun);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const es = new EventSource(`/api/runs/${id}/events`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data as string) as { step: string; payload: Record<string, unknown> };
      setEvents((prev) => [...prev, data]);

      if (data.step === 'completed' || data.step === 'failed') {
        es.close();
        // Refresh run to get final token/cost data
        api.runs.get(id).then(setRun);
      }
    };

    return () => es.close();
  }, [id]);

  if (!run) return <p>Carregando review...</p>;

  const costDollars = (run.costCents / 100).toFixed(4);
  const totalTokens = run.inputTokens + run.outputTokens;

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link to="/" style={{ color: '#6b7280', fontSize: 13 }}>← Repositórios</Link>
      </div>

      <h1 style={{ marginTop: 4 }}>
        PR #{run.prNumber} — {run.prTitle}
      </h1>
      <p style={{ color: '#6b7280', marginTop: -12, fontSize: 13 }}>
        {run.repository.owner}/{run.repository.name} ·{' '}
        {new Date(run.createdAt).toLocaleString('pt-BR')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Pipeline</h2>
          <PipelineView events={events} status={run.status} />
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Custo & Tokens</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat label="Custo" value={`$${costDollars}`} highlight />
            <Stat label="Modelo" value={run.model || '—'} />
            <Stat label="Input tokens" value={run.inputTokens.toLocaleString()} />
            <Stat label="Output tokens" value={run.outputTokens.toLocaleString()} />
            <Stat label="Cache reads" value={run.cacheReadTokens.toLocaleString()} />
            <Stat label="Total tokens" value={totalTokens.toLocaleString()} />
          </div>
        </section>
      </div>

      {run.comments.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Comentários ({run.comments.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {run.comments.map((c) => (
              <div key={c.id} style={{
                padding: '10px 14px',
                border: `1px solid ${SEVERITY_BORDER[c.severity] ?? '#e5e7eb'}`,
                borderRadius: 6,
                background: SEVERITY_BG[c.severity] ?? '#fff',
              }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  <strong>{c.path}</strong> · linha {c.line} · {c.severity}
                </div>
                <div style={{ fontSize: 14 }}>{c.body}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const SEVERITY_BORDER: Record<string, string> = {
  error: '#fca5a5',
  warning: '#fde68a',
  suggestion: '#bfdbfe',
};
const SEVERITY_BG: Record<string, string> = {
  error: '#fef2f2',
  warning: '#fffbeb',
  suggestion: '#eff6ff',
};

const sectionStyle: React.CSSProperties = {
  padding: 16,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
};
const sectionTitle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 15,
  fontWeight: 600,
  color: '#111827',
};

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? '#2563eb' : '#111827' }}>
        {value}
      </div>
    </div>
  );
}
