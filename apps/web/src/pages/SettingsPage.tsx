import { useEffect, useState, FormEvent } from 'react';
import { api, LlmConfigResponse, ModelPricing, RepoWithStats, KnowledgePackWithEnabled } from '../lib/api';

export default function SettingsPage() {
  const [llmConfig, setLlmConfig] = useState<LlmConfigResponse | null>(null);
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [repos, setRepos] = useState<RepoWithStats[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [packs, setPacks] = useState<KnowledgePackWithEnabled[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.config.llm.get(),
      api.config.pricing.list(),
      api.repos.list(),
    ]).then(([llm, p, r]) => {
      setLlmConfig(llm);
      setPricing(p);
      setRepos(r);
      if (r.length > 0) setSelectedRepo(r[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    api.config.packs.forRepo(selectedRepo).then(setPacks);
  }, [selectedRepo]);

  async function handleSaveLlm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api.config.llm.save({
        provider: form.get('provider') as string,
        model: form.get('model') as string,
        apiKey: form.get('apiKey') as string,
      });
      setLlmConfig(updated);
      setSaveMsg('Configuração salva!');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleTogglePack(packId: string, enabled: boolean) {
    await api.config.packs.toggle(selectedRepo, packId, enabled);
    setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, enabled } : p)));
  }

  async function handleUpdatePricing(id: string, field: keyof Omit<ModelPricing, 'id' | 'provider' | 'model' | 'updatedAt'>, value: string) {
    const entry = pricing.find((p) => p.id === id);
    if (!entry) return;
    const updated = await api.config.pricing.update(id, {
      inputPerMTok: entry.inputPerMTok,
      outputPerMTok: entry.outputPerMTok,
      cacheReadPerMTok: entry.cacheReadPerMTok,
      cacheWritePerMTok: entry.cacheWritePerMTok,
      [field]: parseFloat(value) || 0,
    });
    setPricing((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <h1 style={{ margin: 0 }}>Settings</h1>

      {/* LLM Config */}
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Configuração de LLM</h2>
        {llmConfig && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>
            Atual: <strong>{llmConfig.provider} / {llmConfig.model}</strong> · Chave: {llmConfig.keyHint}
          </p>
        )}
        <form onSubmit={handleSaveLlm} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelStyle}>
            Provedor
            <select name="provider" defaultValue={llmConfig?.provider ?? 'anthropic'} style={inputStyle}>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label style={labelStyle}>
            Modelo
            <input name="model" defaultValue={llmConfig?.model ?? 'claude-opus-4-8'} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            API Key
            <input name="apiKey" type="password" placeholder="sk-ant-..." required style={inputStyle} />
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" disabled={saving} style={btnStyle}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {saveMsg && <span style={{ color: '#16a34a', fontSize: 13 }}>{saveMsg}</span>}
          </div>
        </form>
      </section>

      {/* Knowledge Packs per repo */}
      {repos.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Knowledge Packs</h2>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Repositório
            <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} style={inputStyle}>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {packs.map((pack) => (
              <label key={pack.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: pack.enabled ? '#eff6ff' : '#fff' }}>
                <input
                  type="checkbox"
                  checked={pack.enabled}
                  onChange={(e) => handleTogglePack(pack.id, e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{pack.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{pack.description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Model Pricing */}
      {pricing.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Preços por Modelo ($/MTok)</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0 }}>
            Edite conforme seu contrato com o provedor. Os valores afetam o cálculo de custo de cada review.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Modelo</th>
                <th style={thStyle}>Input</th>
                <th style={thStyle}>Output</th>
                <th style={thStyle}>Cache read</th>
                <th style={thStyle}>Cache write</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.model}</td>
                  {(['inputPerMTok', 'outputPerMTok', 'cacheReadPerMTok', 'cacheWritePerMTok'] as const).map((field) => (
                    <td key={field} style={tdStyle}>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p[field]}
                        style={{ width: 70, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                        onBlur={(e) => handleUpdatePricing(p.id, field, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

const sectionStyle: React.CSSProperties = { padding: 18, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' };
const sectionTitle: React.CSSProperties = { margin: '0 0 14px', fontSize: 16, fontWeight: 600 };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, width: '100%' };
const btnStyle: React.CSSProperties = { padding: '7px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const thStyle: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' };
const tdStyle: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f3f4f6' };
