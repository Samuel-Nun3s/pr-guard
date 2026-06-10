import { Routes, Route, NavLink } from 'react-router-dom';
import ReposPage from './pages/ReposPage';
import RunDetailPage from './pages/RunDetailPage';
import UsagePage from './pages/UsagePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 200, padding: 16, background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ marginBottom: 8 }}>PR-Guard</strong>
        <NavLink to="/">Repos</NavLink>
        <NavLink to="/usage">Custos & Uso</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>
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
