import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Run, RepoWithStats } from '../lib/api';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  RUNNING:   'bg-blue-100 text-blue-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
};

export default function RepoRunsPage() {
  const { id } = useParams<{ id: string }>();
  const [runs, setRuns] = useState<Run[]>([]);
  const [repo, setRepo] = useState<RepoWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.repos.runs(id),
      api.repos.list(),
    ]).then(([runsData, reposData]) => {
      setRuns(runsData);
      setRepo(reposData.find((r) => r.id === id) ?? null);
      setLoading(false);
    });
  }, [id]);

  const repoName = repo ? `${repo.owner}/${repo.name}` : 'Repository';

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Repositories
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{repoName}</h1>
        <p className="text-sm text-gray-500 mt-1">All review runs for this repository</p>
      </div>

      {loading ? (
        <Skeleton />
      ) : runs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-gray-700">No runs yet</p>
          <p className="text-sm text-gray-400 mt-1">Open a pull request to trigger the first review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: Run }) {
  const cost = run.costCents > 0 ? `$${(run.costCents / 100).toFixed(4)}` : '—';

  return (
    <Link
      to={`/runs/${run.id}`}
      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm hover:border-gray-300 transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">#{run.prNumber}</span>
          <span className="font-medium text-gray-900 truncate">{run.prTitle}</span>
        </div>
        <span className="text-xs text-gray-400 mt-0.5 block">
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-400">{cost}</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {run.status}
        </span>
        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-40" />
        </div>
      ))}
    </div>
  );
}
