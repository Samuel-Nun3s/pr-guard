import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api, UsageGroup } from '../lib/api';

const COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function UsagePage() {
  const [byDay,   setByDay]   = useState<UsageGroup[]>([]);
  const [byModel, setByModel] = useState<UsageGroup[]>([]);
  const [byRepo,  setByRepo]  = useState<UsageGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.usage.get({ groupBy: 'day' }),
      api.usage.get({ groupBy: 'model' }),
      api.usage.get({ groupBy: 'repo' }),
    ]).then(([d, m, r]) => {
      setByDay(d.grouped ?? []);
      setByModel(m.grouped ?? []);
      setByRepo(r.grouped ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageSkeleton />;

  const totalCost   = byDay.reduce((s, r) => s + r.costCents, 0);
  const totalTokens = byDay.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  const totalRuns   = byDay.reduce((s, r) => s + r.runs, 0);

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Usage & Costs</h1>
        <p className="text-sm text-gray-500 mt-1">Token consumption and LLM spend across all reviews</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total cost"   value={`$${(totalCost / 100).toFixed(4)}`}   highlight />
        <StatCard label="Total tokens" value={totalTokens.toLocaleString()} />
        <StatCard label="Reviews"      value={totalRuns.toString()} />
      </div>

      {/* Cost per day */}
      <ChartCard title="Cost per day ($)">
        {byDay.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="key" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 100).toFixed(3)}`} />
              <Tooltip formatter={(v: number) => [`$${(v / 100).toFixed(4)}`, 'Cost']} />
              <Bar dataKey="costCents" fill="#4f6ef7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Cost by model */}
        <ChartCard title="Cost by model">
          {byModel.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byModel}
                  dataKey="costCents"
                  nameKey="key"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {byModel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${(v / 100).toFixed(4)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Cost by repo */}
        <ChartCard title="Cost by repository">
          {byRepo.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRepo} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 100).toFixed(3)}`} />
                <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [`$${(v / 100).toFixed(4)}`, 'Cost']} />
                <Bar dataKey="costCents" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tokens by type per day */}
      {byDay.length > 0 && (
        <ChartCard title="Tokens by type per day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="key" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="inputTokens"      name="Input"      fill="#4f6ef7" stackId="a" />
              <Bar dataKey="outputTokens"     name="Output"     fill="#10b981" stackId="a" />
              <Bar dataKey="cacheReadTokens"  name="Cache read" fill="#f59e0b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>;
}

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-20" />)}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl h-56" />
    </div>
  );
}
