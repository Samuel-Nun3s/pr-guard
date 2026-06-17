import { useEffect, useState, useRef, FormEvent } from 'react';
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

// ── New-config form (inline) ───────────────────────────────────────────────

function NewConfigForm({
  pricing,
  onCreated,
  onCancel,
}: {
  pricing: ModelPricing[];
  onCreated: (cfg: LlmConfigResponse) => void;
  onCancel: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [customProvider, setCustomProvider] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const resolvedProvider = selectedProvider === OTHER_VALUE ? customProvider.trim() : selectedProvider;
    try {
      const created = await api.config.llm.create({
        label:    (form.get('label') as string).trim(),
        provider: resolvedProvider,
        model:    model.trim() || (form.get('model') as string),
        apiKey:   form.get('apiKey') as string,
        baseUrl:  baseUrl.trim() || undefined,
      });
      onCreated(created);
    } finally {
      setSaving(false);
    }
  }

  const modelOptions = (selectedProvider === OTHER_VALUE
    ? pricing
    : pricing.filter((p) => p.provider === selectedProvider)
  ).map((p) => p.model);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4 border-t border-gray-100 mt-2">
      <Field label="Label (optional)">
        <input name="label" placeholder="e.g. OpenAI Production, Anthropic Test…" className={inputCls} />
      </Field>

      <Field label="Provider">
        <div className="grid grid-cols-3 gap-3">
          {PRESET_PROVIDERS.map((p) => (
            <button key={p.value} type="button"
              onClick={() => { setSelectedProvider(p.value); setModel(''); }}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedProvider === p.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <span className={selectedProvider === p.value ? 'text-blue-600' : 'text-gray-400'}>{p.logo}</span>
              <div>
                <p className={`text-sm font-semibold ${selectedProvider === p.value ? 'text-blue-700' : 'text-gray-700'}`}>{p.label}</p>
                <p className="text-xs text-gray-400">{p.description}</p>
              </div>
              {selectedProvider === p.value && <span className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">✓</span>}
            </button>
          ))}
          <button type="button"
            onClick={() => { setSelectedProvider(OTHER_VALUE); setModel(''); }}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedProvider === OTHER_VALUE ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <span className={`text-xl ${selectedProvider === OTHER_VALUE ? 'text-blue-600' : 'text-gray-400'}`}>⚙️</span>
            <div>
              <p className={`text-sm font-semibold ${selectedProvider === OTHER_VALUE ? 'text-blue-700' : 'text-gray-700'}`}>Other</p>
              <p className="text-xs text-gray-400">OpenAI-compatible</p>
            </div>
            {selectedProvider === OTHER_VALUE && <span className="ml-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">✓</span>}
          </button>
        </div>

        {selectedProvider === OTHER_VALUE && (
          <div className="mt-3 flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">Any OpenAI-compatible API — Groq, Mistral, Together AI, Ollama, etc.</p>
            <Field label="Provider name">
              <input value={customProvider} onChange={(e) => setCustomProvider(e.target.value)} placeholder="groq, mistral, ollama…" className={inputCls} />
            </Field>
            <Field label="Base URL">
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.groq.com/openai/v1" className={inputCls} />
            </Field>
          </div>
        )}
      </Field>

      <Field label="Model">
        <ModelCombobox value={model} onChange={setModel} placeholder="e.g. claude-opus-4-8" options={modelOptions} />
      </Field>

      <Field label="API Key">
        <input name="apiKey" type="password" placeholder="sk-ant-…" required className={inputCls} />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save configuration'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [llmConfigs,   setLlmConfigs]   = useState<LlmConfigResponse[]>([]);
  const [showNewForm,  setShowNewForm]  = useState(false);
  const [pricing,      setPricing]      = useState<ModelPricing[]>([]);
  const [repos,        setRepos]        = useState<RepoWithStats[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [packs,        setPacks]        = useState<KnowledgePackWithEnabled[]>([]);

  useEffect(() => {
    Promise.all([api.config.llm.list(), api.config.pricing.list(), api.repos.list()])
      .then(([cfgs, p, r]) => {
        setLlmConfigs(cfgs);
        setShowNewForm(cfgs.length === 0);
        setPricing(p);
        setRepos(r);
        if (r.length > 0) setSelectedRepo(r[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    api.config.packs.forRepo(selectedRepo).then(setPacks);
  }, [selectedRepo]);

  async function handleActivate(id: string) {
    const updated = await api.config.llm.activate(id);
    setLlmConfigs((prev) => prev.map((c) => ({ ...c, active: c.id === updated.id })));
  }

  async function handleDelete(id: string) {
    await api.config.llm.delete(id);
    setLlmConfigs((prev) => {
      const next = prev.filter((c) => c.id !== id);
      // If we deleted the active one, auto-mark the last remaining as active (mirrors backend)
      if (prev.find((c) => c.id === id)?.active && next.length > 0) {
        next[next.length - 1] = { ...next[next.length - 1], active: true };
      }
      return next;
    });
  }

  function handleCreated(cfg: LlmConfigResponse) {
    setLlmConfigs((prev) => {
      // If this is the first config it came back as active
      return cfg.active
        ? [...prev.map((c) => ({ ...c, active: false })), cfg]
        : [...prev, cfg];
    });
    setShowNewForm(false);
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
      inputPerMTok:      entry.inputPerMTok,
      outputPerMTok:     entry.outputPerMTok,
      cacheReadPerMTok:  entry.cacheReadPerMTok,
      cacheWritePerMTok: entry.cacheWritePerMTok,
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

      {/* LLM Configurations */}
      <Card title="LLM Configurations">
        {/* Saved configs list */}
        {llmConfigs.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {llmConfigs.map((cfg) => (
              <div key={cfg.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${cfg.active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex-1 min-w-0">
                  {cfg.label && <p className="text-sm font-semibold text-gray-800 truncate">{cfg.label}</p>}
                  <p className={`text-sm ${cfg.label ? 'text-gray-500' : 'font-semibold text-gray-800'} truncate`}>
                    {cfg.provider} / {cfg.model}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{cfg.keyHint}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cfg.active
                    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500 text-white">Active</span>
                    : (
                      <button onClick={() => handleActivate(cfg.id)}
                        className="text-xs font-medium px-2 py-0.5 rounded-full border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                        Activate
                      </button>
                    )
                  }
                  <button
                    onClick={() => handleDelete(cfg.id)}
                    disabled={llmConfigs.length === 1}
                    title={llmConfigs.length === 1 ? 'Cannot delete the only configuration' : 'Delete'}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new button */}
        {!showNewForm && (
          <button onClick={() => setShowNewForm(true)}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add configuration
          </button>
        )}

        {showNewForm && (
          <NewConfigForm
            pricing={pricing}
            onCreated={handleCreated}
            onCancel={() => llmConfigs.length > 0 && setShowNewForm(false)}
          />
        )}
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
              <label key={pack.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${pack.enabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <input type="checkbox" checked={pack.enabled}
                  onChange={(e) => handleTogglePack(pack.id, e.target.checked)}
                  className="mt-0.5 accent-blue-600" />
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
                        <input type="number" step="0.01" defaultValue={p[field]}
                          onBlur={(e) => handleUpdatePricing(p.id, field, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
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

function ModelCombobox({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder?: string; options: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter((o) => o.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} placeholder={placeholder ?? 'e.g. claude-opus-4-8'}
          className={`${inputCls} pr-8`} />
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map((option) => (
            <li key={option}>
              <button type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(option); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${option === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                {option}
              </button>
            </li>
          ))}
        </ul>
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
