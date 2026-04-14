// src/pages/LeadsTable.tsx
import { useEffect, useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Lead, LeadStatus, RegionCode, PaginatedResponse } from '../types';
import { REGIONS, STATUS_LABELS, STATUS_COLORS } from '../types';
import { format } from 'date-fns';

export default function LeadsTable() {
  const [data, setData] = useState<PaginatedResponse<Lead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [region, setRegion] = useState<RegionCode | ''>('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Lead | null>(null);
  const [month, setMonth]     = useState('4');
  const [year,  setYear]      = useState('2025');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads({
        page,
        limit: 50,
        ...(region && { region }),
        ...(status && { status }),
        ...(search && { search }),
        ...(month && year && { month, year }),
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, region, status, month, year]);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search]);

  const exportCSV = () => {
    if (!data?.data.length) return;
    const cols = ['id', 'external_id', 'state_code', 'region_code', 'status', 'assigned_to', 'synced_at'];
    const header = cols.join(',');
    const rows = data.data.map(l => cols.map(c => JSON.stringify(l[c as keyof Lead] ?? '')).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `visitas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Visitas</h2>
        <button onClick={exportCSV} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          {YEARS_OPT.map(y => <option key={y.v} value={y.v}>{y.l}</option>)}
        </select>
        <select
          value={region}
          onChange={e => { setRegion(e.target.value as RegionCode | ''); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">Todas as regiões</option>
          {REGIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as LeadStatus | ''); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-500">ID</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">UF</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Região</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Responsável</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Endereço / Local</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Sincronizado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Nenhum lead encontrado</td></tr>
            ) : data?.data.map(lead => (
              <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{lead.id}</td>
                <td className="px-5 py-3">
                  <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                    {lead.state_code ?? '—'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {lead.region_code ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: REGIONS.find(r => r.code === lead.region_code)?.color }}
                      />
                      <span className="text-gray-700">{REGIONS.find(r => r.code === lead.region_code)?.label}</span>
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {lead.assigned_to
                    ? lead.assigned_to
                    : (() => {
                        const r = lead.raw_data as any;
                        const n = [r?.nome_colaborador, r?.sobrenome_colaborador].filter(Boolean).join(' ');
                        return n || <span className="text-gray-300">—</span>;
                      })()
                  }
                </td>
                <td className="px-5 py-3">
                  {(() => {
                    const r    = lead.raw_data as any;
                    const lat  = parseFloat(r?.latitude_fim  || '0');
                    const lon  = parseFloat(r?.longitude_fim || '0');
                    const custo = String(r?.centro_custo || '').trim();
                    const dest  = (lead as any).destination_name as string | null;
                    const hasCoords = lat !== 0 && lon !== 0 && !isNaN(lat) && !isNaN(lon);
                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
                    return (
                      <div className="space-y-0.5">
                        {dest && (
                          <span className="text-xs font-medium text-gray-800 truncate block max-w-48" title={dest}>
                            {dest.length > 35 ? dest.slice(0,35)+'…' : dest}
                          </span>
                        )}
                        {hasCoords && (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 hover:underline">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {dest ? 'Ver localização' : 'Ver no mapa'}
                          </a>
                        )}
                        {!dest && custo && (
                          <span className="text-xs text-gray-400 truncate block max-w-44" title={custo}>
                            {custo.length > 30 ? custo.slice(0,30)+'…' : custo}
                          </span>
                        )}
                        {!hasCoords && !custo && !dest && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {format(new Date(lead.synced_at), 'dd/MM/yy HH:mm')}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => setEditing(lead)} className="text-gray-400 hover:text-violet-600">
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {data.pagination.total.toLocaleString('pt-BR')} leads · página {data.pagination.page} de {data.pagination.pages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSave={async (updates) => {
            await api.updateLead(editing.id, updates);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditModal({ lead, onClose, onSave }: {
  lead: Lead;
  onClose: () => void;
  onSave: (updates: Partial<Lead>) => Promise<void>;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to ?? '');
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md mx-4 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Editar lead #{lead.id}</h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as LeadStatus)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
          <input
            type="text"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Nome do responsável"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
          <button
            onClick={async () => {
              setSaving(true);
              await onSave({ status, assigned_to: assignedTo, notes });
              setSaving(false);
            }}
            disabled={saving}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
