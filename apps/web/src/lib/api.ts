const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  repos: {
    list: () => get('/repos'),
  },
  runs: {
    list: () => get('/runs'),
    get: (id: string) => get(`/runs/${id}`),
  },
  usage: {
    get: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return get(`/usage?${params}`);
    },
  },
};
