// src/pages/NeowayMapPage.tsx
import { useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw, Crosshair, CheckCircle, Layers, AlertCircle } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';
declare global { interface Window { L: any } }

export default function NeowayMapPage() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any>(null);

  const [stats,        setStats]        = useState<any>(null);
  const [filter,       setFilter]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [geocoding,    setGeocoding]    = useState(false);
  const [matching,     setMatching]     = useState(false);
  const [msg,          setMsg]          = useState('');
  const [leafletReady, setLeafletReady] = useState(false);
  const [radius,       setRadius]       = useState('2');

  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setLeafletReady(true); return; }
    const link = document.createElement('link');
    link.id='leaflet-css'; link.rel='stylesheet';
    link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload=()=>setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  const loadStats = async () => {
    const res  = await fetch(`${API}/geocode-neoway`);
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => { loadStats(); }, []);

  const loadMap = async () => {
    if (!leafletReady) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter)       qs.set('region', filter);
      if (statusFilter) qs.set('status', statusFilter);
      const res  = await fetch(`${API}/get-neoway-leads?limit=500&${qs}`);
      const data = await res.json();
      const leads = (data.data || []).filter((l: any) => l.lat && l.lon);

      const L = window.L; if (!L) return;
      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current!).setView([-15.77,-47.92],5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(leafletMap.current);
      }
      if (markersRef.current) markersRef.current.clearLayers();
      markersRef.current = L.layerGroup().addTo(leafletMap.current);

      leads.forEach((lead: any) => {
        const isVisited = lead.status === 'visitado' || lead.status === 'vendido';
        const isSold    = lead.status === 'vendido';
        const region    = REGIONS.find(r => r.code === lead.region_code);

        // Cor: verde=visitado/vendido, vermelho=sem endereço, cinza=novo, cor da região=padrão
        const color = isSold    ? '#16a34a' :
                      isVisited ? '#22c55e' :
                      lead.status==='sem_endereco' ? '#ef4444' :
                      region?.color || '#6b7280';

        const size  = isVisited ? 14 : 10;
        const icon  = L.divIcon({
          className:'',
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,.35);
            ${isVisited?'ring:2px solid '+color+';':''}
          "></div>`,
          iconSize:[size,size], iconAnchor:[size/2,size/2],
        });

        const popup = `
          <div style="font-family:sans-serif;font-size:13px;min-width:200px">
            <div style="font-weight:600;color:#111;margin-bottom:4px">${lead.name||'—'}</div>
            ${lead.cnpj?`<div style="font-size:11px;font-family:monospace;color:#6b7280;margin-bottom:6px">${lead.cnpj}</div>`:''}
            <div style="margin-bottom:6px">
              <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500">
                ${isVisited?'✓ Visitado':isSold?'✓ Vendido':lead.status==='sem_endereco'?'✗ Sem endereço':'Novo'}
              </span>
            </div>
            ${lead.address?`<div style="font-size:11px;color:#6b7280;margin-bottom:4px">${lead.address}</div>`:''}
            ${lead.city?`<div style="font-size:11px;color:#9ca3af">${lead.city} - ${lead.state_code||''}</div>`:''}
            ${lead.executivo_visita?`<div style="font-size:11px;color:#7c3aed;margin-top:6px">👤 ${lead.executivo_visita}</div>`:''}
            ${lead.visited_at?`<div style="font-size:11px;color:#9ca3af">${new Date(lead.visited_at).toLocaleDateString('pt-BR')}</div>`:''}
          </div>`;

        L.marker([lead.lat, lead.lon], { icon })
          .bindPopup(popup, { maxWidth:260 })
          .addTo(markersRef.current);
      });

    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (leafletReady) loadMap();
  }, [leafletReady, filter, statusFilter]);

  const handleGeocode = async () => {
    setGeocoding(true); setMsg('');
    try {
      let total = 0;
      while (true) {
        const res  = await fetch(`${API}/geocode-neoway?action=geocode&limit=10`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        total += data.geocoded || 0;
        setMsg(`Geocodificados: ${total} · Pendentes: ${data.remaining}`);
        if (data.remaining === 0 || data.geocoded === 0) break;
        await new Promise(r => setTimeout(r, 500));
      }
      await loadStats();
      loadMap();
    } catch(e: any) { setMsg('Erro: ' + e.message); }
    finally { setGeocoding(false); }
  };

  const handleMatch = async () => {
    setMatching(true); setMsg('');
    try {
      const res  = await fetch(`${API}/geocode-neoway?action=match&radius_km=${radius}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMsg(`${data.matched} leads marcados como visitados (raio ${radius} km)`);
      await loadStats();
      loadMap();
    } catch(e: any) { setMsg('Erro: ' + e.message); }
    finally { setMatching(false); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-green-600"/>
            <h2 className="text-base font-semibold text-gray-900">Mapa de leads Neoway</h2>
            {stats && (
              <div className="flex items-center gap-3 ml-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500"/>{stats.geocodificados} no mapa</span>
                <span className="flex items-center gap-1"><AlertCircle size={12} className="text-yellow-500"/>{stats.pendentes} sem coords</span>
                <span className="flex items-center gap-1"><MapPin size={12} className="text-violet-500"/>{stats.visitados} visitados</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats?.pendentes > 0 && (
              <button onClick={handleGeocode} disabled={geocoding}
                className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={12} className={geocoding?'animate-spin':''}/> 
                {geocoding ? 'Geocodificando...' : `Geocodificar ${stats.pendentes} leads`}
              </button>
            )}
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5">
              <Crosshair size={12} className="text-green-600"/>
              <span className="text-xs text-gray-500">Raio:</span>
              <input type="number" value={radius} onChange={e=>setRadius(e.target.value)}
                className="w-12 text-xs focus:outline-none text-center" min="0.1" max="50" step="0.5"/>
              <span className="text-xs text-gray-400">km</span>
            </div>
            <button onClick={handleMatch} disabled={matching}
              className="flex items-center gap-1.5 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-50">
              <Crosshair size={12} className={matching?'animate-spin':''}/> 
              {matching ? 'Cruzando...' : 'Cruzar visitas'}
            </button>
          </div>
        </div>

        {msg && <div className="mt-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">{msg}</div>}

        {/* Filters */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Layers size={13} className="text-gray-400"/>
          <select value={filter} onChange={e=>{setFilter(e.target.value);}} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
            <option value="">Todas as regiões</option>
            {REGIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
            <option value="">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="visitado">Visitado</option>
            <option value="vendido">Vendido</option>
            <option value="sem_endereco">Sem endereço</option>
          </select>
          <button onClick={loadMap} disabled={loading} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={12} className={loading?'animate-spin':''}/> 
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-6 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-gray-400 border-2 border-white shadow-sm"/> Novo</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow-sm"/> Visitado</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-green-700 border-2 border-white shadow-sm"/> Vendido</div>
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-white shadow-sm"/> Sem endereço</div>
        <span className="ml-4 text-gray-400">· Pontos maiores = visitados</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"/>
              <span className="text-sm text-gray-600">Carregando leads...</span>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{height:'100%',width:'100%'}}/>
        {!loading && stats?.geocodificados === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <MapPin size={32} className="text-gray-300 mx-auto mb-2"/>
              <p className="text-sm text-gray-500 font-medium">Nenhum lead geocodificado</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Geocodificar leads" para converter os endereços em coordenadas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
