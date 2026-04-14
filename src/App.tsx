// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, RefreshCw, Map, Upload, Globe, BarChart2, Building2 } from 'lucide-react';
import Dashboard        from './pages/Dashboard';
import LeadsTable       from './pages/LeadsTable';
import RegionPage       from './pages/RegionPage';
import SyncPage         from './pages/SyncPage';
import ImportPage       from './pages/ImportPage';
import MapPage          from './pages/MapPage';
import ManagerDashboard from './pages/ManagerDashboard';
import NeowayLeadsPage  from './pages/NeowayLeadsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-5 border-b border-gray-200">
            <h1 className="text-base font-semibold text-gray-900">Lead Distribution</h1>
            <p className="text-xs text-gray-400 mt-0.5">Paytrack · Neoway · Omnilink</p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            <SectionLabel label="Paytrack"/>
            <NavItem to="/"       icon={<LayoutDashboard size={15}/>} label="Dashboard"/>
            <NavItem to="/visitas" icon={<Users size={15}/>}          label="Visitas"/>
            <NavItem to="/mapa"   icon={<Globe size={15}/>}           label="Mapa de visitas"/>

            <SectionLabel label="Neoway"/>
            <NavItem to="/gestor"  icon={<BarChart2 size={15}/>}     label="Dashboard gestor"/>
            <NavItem to="/neoway"  icon={<Building2 size={15}/>}     label="Leads Neoway"/>
            <NavItem to="/import"  icon={<Upload size={15}/>}        label="Importar Excel"/>

            <SectionLabel label="Config"/>
            <NavItem to="/regioes" icon={<Map size={15}/>}           label="Regiões"/>
            <NavItem to="/sync"    icon={<RefreshCw size={15}/>}     label="Sincronizar"/>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">v1.2 · Neon DB</p>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"        element={<Dashboard/>}/>
            <Route path="/visitas" element={<LeadsTable/>}/>
            <Route path="/mapa"    element={<MapPage/>}/>
            <Route path="/gestor"  element={<ManagerDashboard/>}/>
            <Route path="/neoway"  element={<NeowayLeadsPage/>}/>
            <Route path="/import"  element={<ImportPage/>}/>
            <Route path="/regioes" element={<RegionPage/>}/>
            <Route path="/sync"    element={<SyncPage/>}/>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="text-[10px] font-medium text-gray-400 px-3 pt-3 pb-1 uppercase tracking-wider">{label}</p>;
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} end={to==='/'} className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        isActive ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}>
      {icon}{label}
    </NavLink>
  );
}
