import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ReposPage() {
  const [repos, setRepos] = useState<unknown[]>([]);

  useEffect(() => {
    api.repos.list().then((r) => setRepos(r as unknown[]));
  }, []);

  return (
    <div>
      <h1>Repositórios</h1>
      {repos.length === 0 && <p>Nenhum repositório instalado ainda.</p>}
      <ul>
        {(repos as Array<{ id: string; owner: string; name: string }>).map((r) => (
          <li key={r.id}>
            <Link to={`/repos/${r.id}`}>{r.owner}/{r.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
