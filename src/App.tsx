// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, RefreshCw, Map } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LeadsTable from './pages/LeadsTable';
import RegionPage from './pages/RegionPage';
import SyncPage from './pages/SyncPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h1 className="text-base font-semibold text-gray-900">Lead Distribution</h1>
            <p className="text-xs text-gray-400 mt-0.5">Paytrack · Omnilink</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <NavItem to="/" icon={<LayoutDashboard size={16} />} label="Dashboard" />
            <NavItem to="/leads" icon={<Users size={16} />} label="Leads" />
            <NavItem to="/regioes" icon={<Map size={16} />} label="Regiões" />
            <NavItem to="/sync" icon={<RefreshCw size={16} />} label="Sincronizar" />
          </nav>

          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">v1.0 · Neon DB</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/leads"    element={<LeadsTable />} />
            <Route path="/regioes"  element={<RegionPage />} />
            <Route path="/sync"     element={<SyncPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-violet-50 text-violet-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
