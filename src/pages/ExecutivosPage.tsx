// src/pages/ExecutivosPage.tsx
import { useEffect, useState } from 'react';
import { Search, RefreshCw, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface Executivo {
  id: number;
  nome: string;
  region_code: string | null;
  state_code: string | null;
  centro_custo: string | null;
  region_label?: string;
  color?: string;
}

export default function ExecutivosPage() {
  const [execs,    setExecs]    = useState<Executivo[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [syncing,  setSyncing]  = useState(false);
  const [editing,  setEditing]  = useState<Executivo | null>(null);
  const [adding,   setAdding]   = useState(false);
  const [syncMsg,  setSyncMsg]  = useState('');

  const load = async () => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API}/executivos${qs}`);
    setExecs(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    const res  = await fetch(`${API}/executivos?sync=true`);
    const data = await res.json();
    setSyncMsg(`${data.synced} executivos importados das visitas`);
    setSyncing(false);
    load();
  };

  const handleSave = async (nome: string, region_code: string, state_code: string, centro_custo: string, id?: number) => {
    const url    = id ? `${API}/executivos?id=${id}` : `${API}/executivos`;
    const method = id ? 'PATCH' : 'POST';
    await fetch(url, {
      method, headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ nome, region_code: region_code||null, state_code: state_code||null, centro_custo: centro_custo||null }),
    });
    setEditing(null); setAdding(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este executivo?')) return;
    await fetch(`${API}/executivos?id=${id}`, { method:'DELETE' });
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Executivos · Região</h2>
          <p className="text-sm text-gray-400 mt-1">Defina a região correta de cada executivo. Ao salvar, todas as visitas são atualizadas automaticamente.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''}/>
            Importar das visitas
          </button>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm bg-violet-600 text-white rounded-lg px-3 py-2 hover:bg-violet-700">
            <Plus size={14}/> Adicionar
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          <Check size={14}/> {syncMsg}
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"/>
      </div>

      {/* Add form */}
      {adding && (
        <ExecForm onSave={handleSave} onCancel={() => setAdding(false)}/>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Executivo</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Centro de custo</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Região</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">UF</th>
              <th className="px-5 py-3"/>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : execs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-gray-400 mb-3">Nenhum executivo cadastrado</p>
                  <button onClick={handleSync} className="text-sm text-violet-600 hover:underline">
                    Clique em "Importar das visitas" para detectar automaticamente
                  </button>
                </td>
              </tr>
            ) : execs.map(exec => (
              editing?.id === exec.id ? (
                <tr key={exec.id} className="border-b border-violet-100 bg-violet-50">
                  <td colSpan={5} className="px-5 py-3">
                    <ExecForm exec={exec} onSave={handleSave} onCancel={() => setEditing(null)}/>
                  </td>
                </tr>
              ) : (
                <tr key={exec.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: (exec.color || '#6b7280') + '20', color: exec.color || '#6b7280' }}>
                        {exec.nome.split(' ').slice(0,2).map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">{exec.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{exec.centro_custo || '—'}</td>
                  <td className="px-5 py-3">
                    {exec.region_code ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exec.color || '#6b7280' }}/>
                        <span className="text-gray-700 text-sm">{exec.region_label || exec.region_code}</span>
                      </span>
                    ) : <span className="text-red-400 text-xs font-medium">⚠ Sem região</span>}
                  </td>
                  <td className="px-5 py-3">
                    {exec.state_code
                      ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{exec.state_code}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditing(exec)} className="text-gray-400 hover:text-violet-600"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(exec.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Como funciona</p>
        <p>1. Clique em <strong>"Importar das visitas"</strong> para criar automaticamente todos os executivos detectados nas visitas da Paytrack.</p>
        <p className="mt-1">2. Para cada executivo, clique no lápis e defina a <strong>região correta</strong>.</p>
        <p className="mt-1">3. Ao salvar, <strong>todas as visitas</strong> desse executivo são atualizadas automaticamente no banco.</p>
      </div>
    </div>
  );
}

function ExecForm({ exec, onSave, onCancel }: {
  exec?: Executivo; onSave: (n:string,r:string,s:string,c:string,id?:number)=>void; onCancel:()=>void;
}) {
  const [nome,    setNome]    = useState(exec?.nome || '');
  const [region,  setRegion]  = useState(exec?.region_code || '');
  const [state,   setState]   = useState(exec?.state_code || '');
  const [custo,   setCusto]   = useState(exec?.centro_custo || '');

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex-1 min-w-48">
        <label className="block text-xs text-gray-500 mb-1">Nome completo</label>
        <input value={nome} onChange={e => setNome(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="ELISANGELA AIRES BARBOSA" disabled={!!exec}/>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Região</label>
        <select value={region} onChange={e => setRegion(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">— selecionar —</option>
          {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">UF</label>
        <input value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0,2))}
          className="w-16 text-sm border border-gray-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
          placeholder="GO" maxLength={2}/>
      </div>
      <div className="flex-1 min-w-36">
        <label className="block text-xs text-gray-500 mb-1">Centro de custo</label>
        <input value={custo} onChange={e => setCusto(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="4905 - COMERCIAL..."/>
      </div>
      <div className="flex gap-2 pb-0.5">
        <button onClick={() => onSave(nome, region, state, custo, exec?.id)}
          disabled={!nome || !region}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40">
          <Check size={14}/> Salvar
        </button>
        <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          <X size={14}/>
        </button>
      </div>
    </div>
  );
}
