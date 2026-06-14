const BASE = '/api';

const TOKEN_KEY = 'pr_guard_token';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};

function authHeaders(): Record<string, string> {
  const token = auth.getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });
  if (res.status === 401) {
    auth.clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

async function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async (res) => {
        if (!res.ok) throw new Error('Invalid credentials');
        const data = (await res.json()) as { token: string };
        return data.token;
      }),
  },
  repos: {
    list: () => get<RepoWithStats[]>('/repos'),
    runs: (repoId: string) => get<Run[]>(`/repos/${repoId}/runs`),
  },
  runs: {
    list: () => get<Run[]>('/runs'),
    get: (id: string) => get<RunDetail>(`/runs/${id}`),
  },
  usage: {
    get: (params?: { from?: string; to?: string; groupBy?: 'day' | 'repo' | 'model' }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.groupBy) q.set('groupBy', params.groupBy);
      return get<UsageResponse>(`/usage?${q}`);
    },
  },
  config: {
    llm: {
      list: () => get<LlmConfigResponse[]>('/config/llm'),
      create: (body: { label?: string; provider: string; model: string; apiKey: string; baseUrl?: string; reviewMode?: string }) =>
        post<LlmConfigResponse>('/config/llm', body),
      update: (id: string, body: { label?: string; provider?: string; model?: string; apiKey?: string; baseUrl?: string; reviewMode?: string }) =>
        put<LlmConfigResponse>(`/config/llm/${id}`, body),
      activate: (id: string) => put<LlmConfigResponse>(`/config/llm/${id}/activate`, {}),
      delete: (id: string) => request<{ ok: boolean }>(`/config/llm/${id}`, { method: 'DELETE' }),
    },
    packs: {
      all: () => get<KnowledgePack[]>('/config/packs'),
      forRepo: (repoId: string) => get<KnowledgePackWithEnabled[]>(`/config/repos/${repoId}/packs`),
      toggle: (repoId: string, packId: string, enabled: boolean) =>
        put(`/config/repos/${repoId}/packs/${packId}`, { enabled }),
    },
    pricing: {
      list: () => get<ModelPricing[]>('/config/pricing'),
      update: (id: string, body: Omit<ModelPricing, 'id' | 'provider' | 'model' | 'updatedAt'>) =>
        put<ModelPricing>(`/config/pricing/${id}`, body),
    },
  },
};

// ── Shared types ──────────────────────────────────────────────────────────────

export interface RepoWithStats {
  id: string;
  owner: string;
  name: string;
  active: boolean;
  createdAt: string;
  latestRun: { id: string; status: string; prNumber: number; prTitle: string; createdAt: string } | null;
}

export interface Run {
  id: string;
  repositoryId: string;
  prNumber: number;
  prTitle: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  createdAt: string;
}

export interface RunDetail extends Run {
  repository: { owner: string; name: string };
  comments: Array<{ id: string; path: string; line: number; severity: string; body: string }>;
  events: Array<{ id: string; step: string; payload: Record<string, unknown>; createdAt: string }>;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costCents: number;
  runs: number;
}

export interface UsageGroup extends UsageTotals {
  key: string;
}

export interface UsageResponse {
  totals: UsageTotals;
  grouped?: UsageGroup[];
  detail: Run[];
}

export interface LlmConfigResponse {
  id: string;
  label: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  reviewMode: string;
  active: boolean;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgePack {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface KnowledgePackWithEnabled extends KnowledgePack {
  enabled: boolean;
}

export interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
  updatedAt: string;
}
