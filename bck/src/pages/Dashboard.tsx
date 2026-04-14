// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardStats } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboard();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncLeads();
      alert(`Sincronizado! ${result.inserted} inseridos · ${result.updated} atualizados`);
      load();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
    </div>
  );

  const totalNovos     = stats?.stats.reduce((a, r) => a + (r.novos ?? 0), 0) ?? 0;
  const totalAndamento = stats?.stats.reduce((a, r) => a + (r.em_andamento ?? 0), 0) ?? 0;
  const totalConcluido = stats?.stats.reduce((a, r) => a + (r.concluidos ?? 0), 0) ?? 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          {stats?.lastSync && (
            <p className="text-sm text-gray-400 mt-1">
              Última sync:{' '}
              {format(new Date(stats.lastSync.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {' '}· {stats.lastSync.total_fetched} registros
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Paytrack'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={<Users size={18} />}       label="Total de leads"    value={stats?.totalLeads ?? 0} color="violet" />
        <KpiCard icon={<TrendingUp size={18} />}  label="Novos"             value={totalNovos}            color="blue"   />
        <KpiCard icon={<Clock size={18} />}       label="Em andamento"      value={totalAndamento}        color="yellow" />
        <KpiCard icon={<CheckCircle size={18} />} label="Concluídos"        value={totalConcluido}        color="green"  />
      </div>

      {/* Região cards */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Leads por região</h3>
        <div className="grid grid-cols-3 gap-4">
          {stats?.stats.map(region => (
            <div key={region.code} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: region.color }}
                />
                <span className="font-medium text-gray-900 text-sm">{region.label}</span>
                <span className="ml-auto text-2xl font-semibold text-gray-900">{region.total}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600">{region.novos} novos</span>
                <span className="text-yellow-600">{region.em_andamento} andamento</span>
                <span className="text-green-600">{region.concluidos} ok</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: stats?.totalLeads
                      ? `${((region.total ?? 0) / stats.totalLeads) * 100}%`
                      : '0%',
                    backgroundColor: region.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-6">Distribuição por região</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats?.stats} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {stats?.stats.map(entry => (
                <Cell key={entry.code} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'violet' | 'blue' | 'yellow' | 'green';
}) {
  const colors = {
    violet: 'bg-violet-50 text-violet-600',
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}
