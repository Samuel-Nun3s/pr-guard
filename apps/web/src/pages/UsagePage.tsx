import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api, UsageResponse } from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [byDay, setByDay] = useState<UsageResponse | null>(null);
  const [byModel, setByModel] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.usage.get(),
      api.usage.get({ groupBy: 'day' }),
      api.usage.get({ groupBy: 'model' }),
    ])
      .then(([all, day, model]) => {
        setUsage(all);
        setByDay(day);
        setByModel(model);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando dados de uso...</p>;
  if (!usage) return <p>Sem dados ainda.</p>;

  const { totals } = usage;
  const avgCostPerPR = totals.runs > 0 ? totals.costCents / totals.runs / 100 : 0;

  const dayData = (byDay?.grouped ?? []).map((g) => ({
    date: g.key.slice(5), // MM-DD
    cost: g.costCents / 100,
    runs: g.runs,
  }));

  const modelData = (byModel?.grouped ?? []).map((g, i) => ({
    name: g.key.replace('claude-', ''),
    value: g.costCents / 100,
    color: COLORS[i % COLORS.length],
  }));

  const tokenData = [
    { name: 'Input', tokens: totals.inputTokens, fill: '#3b82f6' },
    { name: 'Output', tokens: totals.outputTokens, fill: '#10b981' },
    { name: 'Cache read', tokens: totals.cacheReadTokens, fill: '#f59e0b' },
    { name: 'Cache write', tokens: totals.cacheCreationTokens, fill: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0 }}>Custos & Uso</h1>

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Custo total" value={`$${(totals.costCents / 100).toFixed(4)}`} accent />
        <StatCard label="Reviews realizados" value={String(totals.runs)} />
        <StatCard label="Custo médio / PR" value={`$${avgCostPerPR.toFixed(4)}`} />
        <StatCard label="Total de tokens" value={(totals.inputTokens + totals.outputTokens).toLocaleString()} />
        <StatCard label="Cache reads" value={totals.cacheReadTokens.toLocaleString()} />
      </div>

      {/* Cost by day */}
      {dayData.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Custo por dia ($)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Custo']} />
              <Bar dataKey="cost" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Token breakdown */}
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Tokens por tipo</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tokenData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), 'tokens']} />
              <Bar dataKey="tokens" radius={[0, 3, 3, 0]}>
                {tokenData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Cost by model */}
        {modelData.length > 0 && (
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Custo por modelo</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {modelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'Custo']} />
              </PieChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: 16,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
};
const sectionTitle: React.CSSProperties = { margin: '0 0 12px', fontSize: 15, fontWeight: 600 };

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '12px 18px', background: accent ? '#eff6ff' : '#f9fafb', border: `1px solid ${accent ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: 8, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? '#2563eb' : '#111827' }}>{value}</div>
    </div>
  );
}
