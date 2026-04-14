// src/pages/RankingPage.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, MapPin, Route, Calendar, TrendingUp } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

// Paleta de cores para executivos no mapa
const EXEC_COLORS = [
  '#7c3aed','#0ea5e9','#f97316','#22c55e','#e11d48',
  '#8b5cf6','#06b6d4','#f59e0b','#10b981','#ec4899',
  '#6366f1','#14b8a6','#fb923c','#84cc16','#f43f5e',
];

declare global { interface Window { L: any } }

export default function RankingPage() {
  const [region,    setRegion]    = useState('');
  const [stats,     setStats]     = useState<any[]>([]);
  const [ranking,   setRanking]   = useState<any[]>([]);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [leafletOk, setLeafletOk] = useState(false);
  const [sortBy,    setSortBy]    = useState<'visitas'|'total_km'>('visitas');

  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const layerRef   = useRef<any>(null);

  // Load Leaflet
  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setLeafletOk(true); return; }
    const link = document.createElement('link');
    link.id = 'leaflet-css'; link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletOk(true);
    document.head.appendChild(script);
  }, []);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    const qs = region ? `&region=${region}` : '';
    const [statsRes, rankRes, mapRes] = await Promise.all([
      fetch(`${API}/get-ranking`),
      fetch(`${API}/get-ranking?view=ranking${qs}`),
      fetch(`${API}/get-ranking?view=mappoints${qs}`),
    ]);
    const [s, r, m] = await Promise.all([statsRes.json(), rankRes.json(), mapRes.json()]);
    setStats(s); setRanking(r); setMapPoints(m);
    setLoading(false);
  }, [region]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build exec color map
  const execColorMap: Record<string, string> = {};
  [...new Set(ranking.map(r => r.nome))].forEach((nome, i) => {
    execColorMap[nome as string] = EXEC_COLORS[i % EXEC_COLORS.length];
  });

  // Render map
  useEffect(() => {
    if (!leafletOk || !mapRef.current || mapPoints.length === 0) return;
    const L = window.L; if (!L) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([-15.77, -47.92], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(leafletMap.current);
    }
    if (layerRef.current) layerRef.current.clearLayers();
    layerRef.current = L.layerGroup().addTo(leafletMap.current);

    const filtered = selected ? mapPoints.filter(p => p.assigned_to === selected) : mapPoints;

    filtered.forEach(p => {
      if (!p.lat || !p.lon || isNaN(p.lat) || isNaN(p.lon)) return;
      const color = execColorMap[p.assigned_to] || '#6b7280';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:9px;height:9px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
        iconSize: [9,9], iconAnchor: [4,4],
      });
      const dist = p.distancia ? `${parseFloat(p.distancia).toFixed(1)} km` : '';
      const data = p.data ? p.data.slice(0,10).split('-').reverse().join('/') : '';
      L.marker([p.lat, p.lon], { icon })
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;min-width:180px">
            <div style="font-weight:600;color:#111;margin-bottom:4px">${p.assigned_to}</div>
            ${p.centro_custo ? `<div style="color:#666;font-size:11px;margin-bottom:4px">${p.centro_custo}</div>` : ''}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${dist ? `<span style="background:#eff6ff;color:#3b82f6;padding:1px 6px;border-radius:4px;font-size:11px">${dist}</span>` : ''}
              ${data ? `<span style="color:#9ca3af;font-size:11px">${data}</span>` : ''}
            </div>
          </div>`)
        .addTo(layerRef.current);
    });
  }, [leafletOk, mapPoints, selected, execColorMap]);

  const sorted = [...ranking].sort((a,b) => Number(b[sortBy]) - Number(a[sortBy]));
  const totalKm = ranking.reduce((s,r) => s + Number(r.total_km || 0), 0);
  const totalVisitas = ranking.reduce((s,r) => s + Number(r.visitas || 0), 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-violet-600"/>
            <h2 className="text-base font-semibold text-gray-900">Ranking de executivos</h2>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><MapPin size={13}/>{totalVisitas.toLocaleString('pt-BR')} visitas</span>
            <span className="flex items-center gap-1.5"><Route size={13}/>{totalKm.toLocaleString('pt-BR', {maximumFractionDigits:0})} km</span>
          </div>
        </div>

        {/* Region pills */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setRegion(''); setSelected(null); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!region ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todas
          </button>
          {REGIONS.map(r => {
            const stat = stats.find(s => s.region_code === r.code);
            return (
              <button key={r.code} onClick={() => { setRegion(r.code); setSelected(null); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${region===r.code ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={region===r.code ? {backgroundColor:r.color} : {}}>
                <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:region===r.code?'rgba(255,255,255,0.7)':r.color}}/>
                {r.label}
                {stat && <span className="opacity-70">· {stat.visitas}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: ranking + map */}
      <div className="flex flex-1 overflow-hidden">

        {/* Ranking panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Sort */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button onClick={() => setSortBy('visitas')}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${sortBy==='visitas' ? 'border-b-2 border-violet-600 text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <MapPin size={12}/> Por visitas
            </button>
            <button onClick={() => setSortBy('total_km')}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${sortBy==='total_km' ? 'border-b-2 border-violet-600 text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Route size={12}/> Por km
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"/>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                Nenhum dado encontrado
              </div>
            ) : sorted.map((exec, idx) => {
              const color = execColorMap[exec.nome] || '#6b7280';
              const isSelected = selected === exec.nome;
              const maxVisitas = sorted[0]?.visitas || 1;
              return (
                <button key={exec.nome} onClick={() => setSelected(isSelected ? null : exec.nome)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {/* Rank badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx===0 ? 'bg-yellow-100 text-yellow-700' :
                      idx===1 ? 'bg-gray-100 text-gray-600' :
                      idx===2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'
                    }`}>{idx+1}</div>
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white"
                      style={{backgroundColor: color}}>
                      {exec.nome.split(' ').slice(0,2).map((n:string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{exec.nome}</p>
                      {exec.region_label && (
                        <p className="text-xs text-gray-400">{exec.region_label}</p>
                      )}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex gap-3 ml-[52px]">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin size={10} className="text-violet-500"/>
                      <strong>{exec.visitas}</strong> visitas
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Route size={10} className="text-blue-500"/>
                      <strong>{Number(exec.total_km).toLocaleString('pt-BR', {maximumFractionDigits:0})}</strong> km
                    </span>
                    {exec.dias_ativos > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={10}/>
                        {exec.dias_ativos}d
                      </span>
                    )}
                  </div>
                  {/* Bar */}
                  <div className="mt-2 ml-[52px] h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{width:`${Math.round((exec.visitas/maxVisitas)*100)}%`, backgroundColor:color}}/>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="p-3 border-t border-gray-100 flex-shrink-0 bg-violet-50">
              <p className="text-xs text-violet-600 font-medium truncate">
                Mostrando: {selected}
              </p>
              <button onClick={() => setSelected(null)} className="text-xs text-violet-400 hover:text-violet-600 mt-0.5">
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"/>
                <span className="text-sm text-gray-600">Carregando mapa...</span>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{height:'100%', width:'100%'}}/>
          {!loading && mapPoints.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp size={32} className="text-gray-300 mx-auto mb-2"/>
                <p className="text-sm text-gray-400">Nenhuma visita com localização</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
