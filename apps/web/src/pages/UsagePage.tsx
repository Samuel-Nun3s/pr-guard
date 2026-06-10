import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UsageResponse } from '@pr-guard/shared';
import { api } from '../lib/api';

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    api.usage.get().then((u) => setUsage(u as UsageResponse));
  }, []);

  if (!usage) return <p>Carregando...</p>;

  const { totals, detail } = usage;
  const costBRL = (totals.costCents / 100).toFixed(2);

  return (
    <div>
      <h1>Custos & Uso</h1>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <Stat label="Custo total" value={`$${costBRL}`} />
        <Stat label="Reviews" value={String(totals.runs)} />
        <Stat label="Tokens (input)" value={totals.inputTokens.toLocaleString()} />
        <Stat label="Tokens (output)" value={totals.outputTokens.toLocaleString()} />
        <Stat label="Cache reads" value={totals.cacheReadTokens.toLocaleString()} />
      </div>

      <h2>Custo por review</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={detail.map((r, i) => ({ name: `#${i + 1}`, cost: r.costCents / 100 }))}>
          <XAxis dataKey="name" />
          <YAxis unit="$" />
          <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
          <Bar dataKey="cost" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
