// src/pages/ClientesPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Building2, TrendingUp, Calendar } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface Cliente {
  id: number;
  name: string | null;
  cnpj: string | null;
  state_code: string | null;
  region_code: string | null;
  city: string | null;
  address: string | null;
  has_sale: boolean | null;
  visited_at: string | null;
  notes: string | null;
  assigned_to: string | null;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [pag,      setPag]      = useState({ total:0, pages:1 });
  const [region,   setRegion]   = useState('');
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ view:'clientes', page:String(page), limit:'50' });
    if (region) qs.set('region', region);
    if (search) qs.set('search', search);
    const res  = await fetch(`${API}/get-neoway-leads?${qs}`);
    const data = await res.json();
    setClientes(data.data || []);
    setPag(data.pagination || { total:0, pages:1 });
    setLoading(false);
  }, [page, region, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [region]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <TrendingUp size={18} className="text-green-600"/>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Base de clientes</h2>
          <p className="text-sm text-gray-400">{pag.total.toLocaleString('pt-BR')} clientes convertidos</p>
        </div>
      </div>

      {/* Region pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setRegion('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!region ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todas
        </button>
        {REGIONS.map(r => (
          <button key={r.code} onClick={() => setRegion(r.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${region===r.code ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={region===r.code ? { backgroundColor: r.color } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: region===r.code ? 'rgba(255,255,255,0.7)' : r.color }}/>
            {r.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input type="text" placeholder="Buscar por nome ou CNPJ..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"/>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-green-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Empresa</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">CNPJ</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Endereço</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Região</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Executivo</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Data da venda</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <Building2 size={28} className="text-gray-200 mx-auto mb-2"/>
                  <p className="text-gray-400 text-sm">Nenhum cliente ainda</p>
                  <p className="text-gray-300 text-xs mt-1">Leads marcados como "Vendido" aparecem aqui</p>
                </td>
              </tr>
            ) : clientes.map(c => {
              const reg = REGIONS.find(r => r.code === c.region_code);
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-green-700">
                          {(c.name||'?').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm truncate max-w-44">{c.name || '—'}</p>
                        {c.city && <p className="text-xs text-gray-400">{c.city}{c.state_code ? ` - ${c.state_code}` : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-500">{c.cnpj || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-600 truncate block max-w-48" title={c.address||''}>
                      {c.address ? (c.address.length > 40 ? c.address.slice(0,40)+'…' : c.address) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {reg ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: reg.color }}/>
                        <span className="text-sm text-gray-700">{reg.label}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{c.assigned_to || '—'}</td>
                  <td className="px-5 py-3">
                    {c.visited_at ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full w-fit">
                        <Calendar size={11}/>
                        {new Date(c.visited_at).toLocaleDateString('pt-BR')}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pag.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{pag.total.toLocaleString('pt-BR')} clientes · página {page} de {pag.pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              <button onClick={() => setPage(p => Math.min(pag.pages,p+1))} disabled={page===pag.pages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
