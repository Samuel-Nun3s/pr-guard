import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, RepoWithStats } from '../lib/api';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  RUNNING:   'bg-blue-100 text-blue-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
};

export default function ReposPage() {
  const [repos, setRepos] = useState<RepoWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.repos.list().then((r) => { setRepos(r); setLoading(false); });
  }, []);

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
        <p className="text-sm text-gray-500 mt-1">All repositories monitored by PR-Guard</p>
      </div>

      {loading ? (
        <Skeleton />
      ) : repos.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-3">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: RepoWithStats }) {
  const run = repo.latestRun;
  const status = run?.status ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-semibold text-gray-900 truncate">
          {repo.owner}/<span className="text-blue-600">{repo.name}</span>
        </span>
        {run ? (
          <span className="text-xs text-gray-400">
            Last run: {new Date(run.createdAt).toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">No runs yet</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {status && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        )}
        {run && (
          <Link
            to={`/runs/${run.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            View run →
          </Link>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
      <div className="text-4xl mb-3">📭</div>
      <p className="font-semibold text-gray-700">No repositories yet</p>
      <p className="text-sm text-gray-400 mt-1">Install PR-Guard on a GitHub repository to start reviewing PRs.</p>
    </div>
  );
}
