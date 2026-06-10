import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, RepoWithStats } from '../lib/api';

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#16a34a',
  RUNNING: '#2563eb',
  PENDING: '#d97706',
  FAILED: '#dc2626',
};

export default function ReposPage() {
  const [repos, setRepos] = useState<RepoWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.repos.list()
      .then(setRepos)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando repositórios...</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Repositórios</h1>

      {repos.length === 0 && (
        <p style={{ color: '#6b7280' }}>
          Nenhum repositório instalado ainda. Instale o GitHub App em um repositório para começar.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {repos.map((repo) => (
          <div key={repo.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 16 }}>
                  {repo.owner}/{repo.name}
                </strong>
                {repo.latestRun && (
                  <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                    Último review:{' '}
                    <Link to={`/runs/${repo.latestRun.id}`} style={{ color: '#2563eb' }}>
                      PR #{repo.latestRun.prNumber} — {repo.latestRun.prTitle}
                    </Link>
                    {' · '}
                    {new Date(repo.latestRun.createdAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              {repo.latestRun && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: STATUS_COLOR[repo.latestRun.status] + '20',
                  color: STATUS_COLOR[repo.latestRun.status],
                }}>
                  {repo.latestRun.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '14px 18px',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
};
