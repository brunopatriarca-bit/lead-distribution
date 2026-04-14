// src/pages/NeowayLeadsPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, ShoppingBag, MapPin, Edit2, X, ChevronDown } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

type NStatus = 'novo' | 'visitado' | 'vendido' | 'sem_endereco' | 'cancelado';

interface NLead {
  id: number;
  name: string | null;
  cnpj: string | null;
  state_code: string | null;
  region_code: string | null;
  city: string | null;
  address: string | null;
  address_confirmed: boolean | null;
  status: NStatus;
  has_sale: boolean | null;
  visited_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  raw_data: Record<string, unknown>;
}

const STATUS_LABELS: Record<NStatus, string> = {
  novo: 'Novo', visitado: 'Visitado', vendido: 'Vendido',
  sem_endereco: 'Sem endereço', cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<NStatus, string> = {
  novo:         'bg-gray-100 text-gray-600',
  visitado:     'bg-blue-100 text-blue-700',
  vendido:      'bg-green-100 text-green-700',
  sem_endereco: 'bg-yellow-100 text-yellow-700',
  cancelado:    'bg-red-100 text-red-700',
};

export default function NeowayLeadsPage() {
  const [leads, setLeads]     = useState<NLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [pagination, setPag]  = useState({ total:0, pages:1 });
  const [region, setRegion]   = useState('');
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [editing,     setEditing]     = useState<NLead | null>(null);
  const [showHidden,  setShowHidden]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit:'50' });
    if (region) qs.set('region', region);
    if (status) qs.set('status', status);
    if (search) qs.set('search', search);
    if (showHidden) qs.set('show_hidden', 'true');
    const res  = await fetch(`${API}/get-neoway-leads?${qs}`);
    const data = await res.json();
    setLeads(data.data || []);
    setPag(data.pagination || { total:0, pages:1 });
    setLoading(false);
  }, [page, region, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [region, status, showHidden]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Leads Neoway</h2>
          <p className="text-sm text-gray-400 mt-1">{pagination.total.toLocaleString('pt-BR')} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHidden(h => !h)}
            className={`text-xs border rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors ${showHidden ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {showHidden ? 'Ocultar em cooldown' : 'Ver em cooldown (15d)'}
          </button>
          <button
            onClick={async () => {
              if (!confirm('Resetar TODOS os leads para status "Novo"? Esta ação não pode ser desfeita.')) return;
              await fetch(`${API}/reset-neoway-status`, { method: 'POST' });
              load();
            }}
            className="text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Resetar todos
          </button>
        </div>
      </div>

      {/* Region filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setRegion('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!region ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todas
        </button>
        {REGIONS.map(r => (
          <button key={r.code} onClick={() => setRegion(r.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${region === r.code ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={region === r.code ? { backgroundColor: r.color } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: region === r.code ? 'rgba(255,255,255,0.7)' : r.color }}/>
            {r.label}
          </button>
        ))}
      </div>

      {/* Search + status filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Buscar por nome ou CNPJ..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"/>
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Empresa</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">CNPJ</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Endereço</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Região</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">End. ok?</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Venda</th>
              <th className="px-4 py-3"/>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Nenhum lead encontrado</td></tr>
            ) : leads.map(lead => {
              const reg = REGIONS.find(r => r.code === lead.region_code);
              return (
                <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 text-sm truncate max-w-44">{lead.name || '—'}</p>
                    {lead.city && <p className="text-xs text-gray-400">{lead.city}{lead.state_code ? ` - ${lead.state_code}` : ''}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-500">{lead.cnpj || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    {lead.address
                      ? <span className="text-xs text-gray-600 truncate block max-w-52" title={lead.address}>{lead.address.length > 45 ? lead.address.slice(0,45)+'…' : lead.address}</span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {reg ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: reg.color }}/>
                        <span className="text-gray-700">{reg.label}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                    {(lead as any).next_visit_date && new Date((lead as any).next_visit_date) > new Date() && (
                      <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        Volta em {Math.ceil((new Date((lead as any).next_visit_date).getTime()-Date.now())/(1000*60*60*24))}d
                      </p>
                    )}
                    {lead.visited_at && !(lead as any).next_visit_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(lead.visited_at).toLocaleDateString('pt-BR')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.address_confirmed === true  && <CheckCircle size={15} className="text-green-500 mx-auto"/>}
                    {lead.address_confirmed === false && <XCircle     size={15} className="text-red-400 mx-auto"/>}
                    {lead.address_confirmed === null  && <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.has_sale === true  && <ShoppingBag size={15} className="text-green-500 mx-auto"/>}
                    {lead.has_sale === false && <XCircle     size={15} className="text-red-400 mx-auto"/>}
                    {lead.has_sale === null  && <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditing(lead)} className="text-gray-400 hover:text-violet-600 transition-colors">
                      <Edit2 size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{pagination.total.toLocaleString('pt-BR')} leads · página {page} de {pagination.pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page===pagination.pages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {editing && <EditModal lead={editing} onClose={() => setEditing(null)} onSave={async (updates) => {
        await fetch(`${API}/update-neoway-lead?id=${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(updates),
        });
        setEditing(null);
        load();
      }}/>}
    </div>
  );
}

function EditModal({ lead, onClose, onSave }: { lead: NLead; onClose: ()=>void; onSave: (u:any)=>Promise<void> }) {
  const [status,       setStatus]       = useState<NStatus>(lead.status);
  const [hasSale,      setHasSale]      = useState<boolean|null>(lead.has_sale);
  const [addrOk,       setAddrOk]       = useState<boolean|null>(lead.address_confirmed);
  const [address,      setAddress]      = useState(lead.address || '');
  const [notes,        setNotes]        = useState(lead.notes || '');
  const [saving,       setSaving]       = useState(false);
  const [fetchingRF,   setFetchingRF]   = useState(false);
  const [rfData,       setRfData]       = useState<any>(null);
  const [rfError,      setRfError]      = useState('');

  const buscarReceita = async () => {
    if (!lead.cnpj) return;
    setFetchingRF(true); setRfError(''); setRfData(null);
    try {
      const res  = await fetch(`${API}/fetch-cnpj?cnpj=${lead.cnpj}&id=${lead.id}&save=true`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRfData(data.data);
      setAddress(data.data.full_address || address);
    } catch(e: any) {
      setRfError(e.message || 'Erro ao consultar Receita Federal');
    } finally { setFetchingRF(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{lead.name || 'Lead'}</h3>
            {lead.cnpj && <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.cnpj}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Status da visita</label>
          <div className="grid grid-cols-3 gap-2">
            {(['novo','visitado','vendido','sem_endereco','cancelado'] as NStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  status === s ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Receita Federal */}
        {lead.cnpj && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">Receita Federal · CNPJ {lead.cnpj}</p>
              <button onClick={buscarReceita} disabled={fetchingRF}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium">
                {fetchingRF ? '⏳ Consultando...' : '🔍 Buscar dados'}
              </button>
            </div>
            {rfError && <p className="text-xs text-red-500">{rfError}</p>}
            {rfData && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                {rfData.razao_social && <><span className="text-gray-400">Razão Social</span><span className="text-gray-700 font-medium truncate">{rfData.razao_social}</span></>}
                {rfData.situacao     && <><span className="text-gray-400">Situação</span><span className={`font-medium ${rfData.situacao.includes('ATIVA') ? 'text-green-600' : 'text-red-500'}`}>{rfData.situacao}</span></>}
                {rfData.municipio    && <><span className="text-gray-400">Município</span><span className="text-gray-700">{rfData.municipio} - {rfData.uf}</span></>}
                {rfData.telefone     && <><span className="text-gray-400">Telefone</span><span className="text-gray-700">{rfData.telefone}</span></>}
                {rfData.cnae         && <><span className="text-gray-400">CNAE</span><span className="text-gray-700 col-span-1 truncate">{rfData.cnae}</span></>}
                {rfData.porte        && <><span className="text-gray-400">Porte</span><span className="text-gray-700">{rfData.porte}</span></>}
              </div>
            )}
          </div>
        )}

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Endereço</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Rua, número, bairro..."/>
        </div>

        {/* Endereço válido? */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Endereço existe?</label>
          <div className="flex gap-2">
            {[
              { val: true,  label: 'Sim, existe',    cls: 'bg-green-600 text-white border-green-600' },
              { val: false, label: 'Não existe',      cls: 'bg-red-500 text-white border-red-500' },
              { val: null,  label: 'Não verificado',  cls: 'bg-violet-600 text-white border-violet-600' },
            ].map(o => (
              <button key={String(o.val)} onClick={() => setAddrOk(o.val)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  addrOk === o.val ? o.cls : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Houve venda? */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Houve venda?</label>
          <div className="flex gap-2">
            {[
              { val: true,  label: 'Sim, houve venda', cls: 'bg-green-600 text-white border-green-600' },
              { val: false, label: 'Não houve',        cls: 'bg-red-500 text-white border-red-500' },
              { val: null,  label: 'Não informado',    cls: 'bg-violet-600 text-white border-violet-600' },
            ].map(o => (
              <button key={String(o.val)} onClick={() => setHasSale(o.val)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  hasSale === o.val ? o.cls : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Anotações da visita..."/>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
            Cancelar
          </button>
          <button disabled={saving} onClick={async () => {
            setSaving(true);
            await onSave({ status, has_sale: hasSale, address_confirmed: addrOk, notes, address });
            setSaving(false);
          }} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
