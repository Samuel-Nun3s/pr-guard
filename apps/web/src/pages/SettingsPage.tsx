import { useEffect, useState, FormEvent } from 'react';
import { api, LlmConfigResponse, ModelPricing, RepoWithStats, KnowledgePackWithEnabled } from '../lib/api';

const PRESET_PROVIDERS = [
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017L3.674 20H0L6.57 3.52zm4.132 9.959L8.453 7.687 6.205 13.48h4.496z" />
      </svg>
    ),
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT models',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.372L15.11 7.21a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.398-.677zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
  },
];

const OTHER_VALUE = '__other__';

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string>('anthropic');
  const [customProvider,   setCustomProvider]   = useState<string>('');
  const [baseUrl,          setBaseUrl]          = useState<string>('');
  const [llmConfig,    setLlmConfig]    = useState<LlmConfigResponse | null>(null);
  const [pricing,      setPricing]      = useState<ModelPricing[]>([]);
  const [repos,        setRepos]        = useState<RepoWithStats[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [packs,        setPacks]        = useState<KnowledgePackWithEnabled[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState('');

  useEffect(() => {
    Promise.all([
      api.config.llm.get(),
      api.config.pricing.list(),
      api.repos.list(),
    ]).then(([llm, p, r]) => {
      setLlmConfig(llm);
      if (llm) {
        const isPreset = PRESET_PROVIDERS.some((p) => p.value === llm.provider);
        setSelectedProvider(isPreset ? llm.provider : OTHER_VALUE);
        if (!isPreset) setCustomProvider(llm.provider);
        setBaseUrl(llm.baseUrl ?? '');
      }
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
    const resolvedProvider = selectedProvider === OTHER_VALUE ? customProvider.trim() : selectedProvider;
    try {
      const updated = await api.config.llm.save({
        provider: resolvedProvider,
        model:    form.get('model') as string,
        apiKey:   form.get('apiKey') as string,
        baseUrl:  baseUrl.trim() || undefined,
      });
      setLlmConfig(updated);
      setSaveMsg('Saved!');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleTogglePack(packId: string, enabled: boolean) {
    await api.config.packs.toggle(selectedRepo, packId, enabled);
    setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, enabled } : p)));
  }

  async function handleUpdatePricing(
    id: string,
    field: keyof Omit<ModelPricing, 'id' | 'provider' | 'model' | 'updatedAt'>,
    value: string,
  ) {
    const entry = pricing.find((p) => p.id === id);
    if (!entry) return;
    const updated = await api.config.pricing.update(id, {
      inputPerMTok:       entry.inputPerMTok,
      outputPerMTok:      entry.outputPerMTok,
      cacheReadPerMTok:   entry.cacheReadPerMTok,
      cacheWritePerMTok:  entry.cacheWritePerMTok,
      [field]: parseFloat(value) || 0,
    });
    setPricing((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your LLM, knowledge packs, and pricing</p>
      </div>

      {/* LLM Config */}
      <Card title="LLM Configuration">
        {llmConfig && (
          <p className="text-sm text-gray-500 mb-4">
            Active: <span className="font-medium text-gray-700">{llmConfig.provider} / {llmConfig.model}</span>
            <span className="ml-2 font-mono text-gray-400">{llmConfig.keyHint}</span>
          </p>
        )}
        <form onSubmit={handleSaveLlm} className="flex flex-col gap-4">
          <Field label="Provider">
            <div className="grid grid-cols-3 gap-3">
              {PRESET_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedProvider(p.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    selectedProvider === p.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={selectedProvider === p.value ? 'text-blue-600' : 'text-gray-400'}>
                    {p.logo}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${selectedProvider === p.value ? 'text-blue-700' : 'text-gray-700'}`}>
                      {p.label}
                    </p>
                    <p className="text-xs text-gray-400">{p.description}</p>
                  </div>
                  {selectedProvider === p.value && (
                    <span className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">✓</span>
                  )}
                </button>
              ))}

              {/* Other card */}
              <button
                type="button"
                onClick={() => setSelectedProvider(OTHER_VALUE)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedProvider === OTHER_VALUE
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className={`text-xl ${selectedProvider === OTHER_VALUE ? 'text-blue-600' : 'text-gray-400'}`}>⚙️</span>
                <div>
                  <p className={`text-sm font-semibold ${selectedProvider === OTHER_VALUE ? 'text-blue-700' : 'text-gray-700'}`}>
                    Other
                  </p>
                  <p className="text-xs text-gray-400">OpenAI-compatible</p>
                </div>
                {selectedProvider === OTHER_VALUE && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">✓</span>
                )}
              </button>
            </div>

            {/* Expanded fields for custom provider */}
            {selectedProvider === OTHER_VALUE && (
              <div className="mt-3 flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">
                  Any OpenAI-compatible API works — Groq, Mistral, Together AI, Ollama, etc.
                </p>
                <Field label="Provider name">
                  <input
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value)}
                    placeholder="groq, mistral, ollama…"
                    className={inputCls}
                  />
                </Field>
                <Field label="Base URL">
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.groq.com/openai/v1"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </Field>
          <Field label="Model">
            <input name="model" defaultValue={llmConfig?.model ?? 'claude-opus-4-8'} className={inputCls} />
          </Field>
          <Field label="API Key">
            <input name="apiKey" type="password" placeholder="sk-ant-..." required className={inputCls} />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
          </div>
        </form>
      </Card>

      {/* Knowledge Packs */}
      {repos.length > 0 && (
        <Card title="Knowledge Packs">
          <Field label="Repository" className="mb-4">
            <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} className={inputCls}>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-2">
            {packs.map((pack) => (
              <label
                key={pack.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  pack.enabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={pack.enabled}
                  onChange={(e) => handleTogglePack(pack.id, e.target.checked)}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{pack.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{pack.description}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* Model Pricing */}
      {pricing.length > 0 && (
        <Card title="Model Pricing ($/MTok)">
          <p className="text-xs text-gray-400 mb-4">
            Edit to match your provider contract. Affects cost calculations for each review.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Model', 'Input', 'Output', 'Cache read', 'Cache write'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricing.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-600">{p.model}</td>
                    {(['inputPerMTok', 'outputPerMTok', 'cacheReadPerMTok', 'cacheWritePerMTok'] as const).map((field) => (
                      <td key={field} className="py-2 pr-4">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={p[field]}
                          onBlur={(e) => handleUpdatePricing(p.id, field, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white';
