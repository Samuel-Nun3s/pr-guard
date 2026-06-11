import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import ReposPage from './pages/ReposPage';
import RunDetailPage from './pages/RunDetailPage';
import UsagePage from './pages/UsagePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { auth } from './lib/api';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function Shell() {
  const navigate = useNavigate();

  function handleLogout() {
    auth.clearToken();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 antialiased">
      <aside className="w-56 shrink-0 flex flex-col bg-gray-900 text-gray-100 px-4 py-6">
        <div className="flex items-center gap-2 mb-6 px-2">
          <span className="text-blue-500 text-xl">⬡</span>
          <span className="font-bold text-white text-base tracking-tight">PR-Guard</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItem to="/">Repositories</NavItem>
          <NavItem to="/usage">Usage & Costs</NavItem>
          <NavItem to="/settings">Settings</NavItem>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-gray-800 transition-colors mt-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Sign out
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Routes>
          <Route path="/" element={<ReposPage />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
