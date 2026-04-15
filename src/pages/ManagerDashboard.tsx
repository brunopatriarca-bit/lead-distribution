// src/pages/ManagerDashboard.tsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, MapPin, CheckCircle, XCircle, ShoppingBag, AlertTriangle } from 'lucide-react';
import { REGIONS } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API}/get-neoway-leads?view=dashboard&t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
    </div>
  );

  const kpis = data?.kpis || {};
  const stats = data?.stats || [];
  const total = Number(kpis.total || 0);
  const visitRate = total > 0 ? Math.round((Number(kpis.visitados) / total) * 100) : 0;
  const saleRate  = Number(kpis.visitados) > 0
    ? Math.round((Number(kpis.vendas) / Number(kpis.visitados)) * 100) : 0;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard do gestor</h2>
        <p className="text-sm text-gray-400 mt-1">Acompanhamento de leads Neoway por região</p>
      </div>
      <button onClick={load} className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 ml-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Atualizar
      </button>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard icon={<MapPin size={17}/>}       label="Total leads"      value={total}                    sub="" color="violet"/>
        <KpiCard icon={<CheckCircle size={17}/>}  label="Visitados"        value={Number(kpis.visitados||0)} sub={`${visitRate}% do total`} color="blue"/>
        <KpiCard icon={<ShoppingBag size={17}/>}  label="Com venda"        value={Number(kpis.vendas||0)}   sub={`${saleRate}% dos visitados`} color="green"/>
        <KpiCard icon={<AlertTriangle size={17}/>} label="End. inválido"   value={Number(kpis.end_invalido||0)} sub="confirmados como inválido" color="yellow"/>
        <KpiCard icon={<XCircle size={17}/>}      label="Sem endereço"     value={Number(kpis.sem_endereco||0)} sub="sem dado de endereço" color="red"/>
      </div>

      {/* Region cards */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Por região</h3>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((r: any) => {
            const reg = REGIONS.find(x => x.code === r.code);
            const tot = Number(r.total || 0);
            return (
              <div key={r.code} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="font-medium text-gray-900 text-sm">{r.label}</span>
                  <span className="ml-auto text-2xl font-semibold text-gray-900">{tot}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-gray-400">Novos</span>        <span className="text-right font-medium text-gray-700">{r.novos}</span>
                  <span className="text-blue-500">Visitados</span>    <span className="text-right font-medium text-blue-600">{r.visitados}</span>
                  <span className="text-green-500">Vendidos</span>    <span className="text-right font-medium text-green-600">{r.vendidos}</span>
                  <span className="text-yellow-500">S/ endereço</span><span className="text-right font-medium text-yellow-600">{r.sem_endereco}</span>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: tot > 0 ? `${Math.round((Number(r.visitados)+Number(r.vendidos))/tot*100)}%` : '0%',
                    backgroundColor: reg?.color,
                  }}/>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {tot > 0 ? Math.round((Number(r.visitados)+Number(r.vendidos))/tot*100) : 0}% visitados
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Visitas × Vendas por região</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="label" tick={{ fontSize:11, fill:'#6b7280' }}/>
              <YAxis tick={{ fontSize:11, fill:'#6b7280' }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }}/>
              <Legend wrapperStyle={{ fontSize:12 }}/>
              <Bar dataKey="visitados" name="Visitados" fill="#60a5fa" radius={[3,3,0,0]}/>
              <Bar dataKey="vendidos"  name="Vendidos"  fill="#34d399" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Status dos endereços por região</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="label" tick={{ fontSize:11, fill:'#6b7280' }}/>
              <YAxis tick={{ fontSize:11, fill:'#6b7280' }}/>
              <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }}/>
              <Legend wrapperStyle={{ fontSize:12 }}/>
              <Bar dataKey="endereco_ok"      name="End. válido"   fill="#34d399" radius={[3,3,0,0]}/>
              <Bar dataKey="endereco_invalido" name="End. inválido" fill="#f87171" radius={[3,3,0,0]}/>
              <Bar dataKey="sem_endereco"      name="Sem endereço"  fill="#d1d5db" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    violet:'bg-violet-50 text-violet-600', blue:'bg-blue-50 text-blue-600',
    green:'bg-green-50 text-green-600',   yellow:'bg-yellow-50 text-yellow-600',
    red:'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value.toLocaleString('pt-BR')}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
