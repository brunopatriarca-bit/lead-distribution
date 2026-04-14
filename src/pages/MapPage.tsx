// src/pages/MapPage.tsx
import { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, RefreshCw } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface MapLead {
  id: number;
  state_code: string | null;
  region_code: string | null;
  raw_data: Record<string, unknown>;
}

declare global {
  interface Window { L: any; }
}

export default function MapPage() {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletMap  = useRef<any>(null);
  const markersRef  = useRef<any>(null);
  const [leads, setLeads]       = useState<MapLead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [total, setTotal]       = useState(0);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setLeafletReady(true); return; }

    const link = document.createElement('link');
    link.id   = 'leaflet-css';
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Fetch all leads with coordinates
  const fetchLeads = async () => {
    setLoading(true);
    try {
      let all: MapLead[] = [];
      let page = 1;
      while (true) {
        const res  = await fetch(`${API}/get-leads?limit=200&page=${page}${filter ? `&region=${filter}` : ''}`);
        const data = await res.json();
        all = [...all, ...data.data];
        if (page >= data.pagination.pages) break;
        page++;
        if (all.length >= 2000) break; // safety cap
      }
      // Keep only leads with coordinates
      const withCoords = all.filter(l => {
        const r = l.raw_data;
        return (r.latitude_fim || r.latitude_inicio) && (r.longitude_fim || r.longitude_inicio);
      });
      setLeads(withCoords);
      setTotal(withCoords.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [filter]);

  // Initialize or update map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || leads.length === 0) return;
    const L = window.L;
    if (!L) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, { zoomControl: true }).setView([-15.77, -47.92], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(leafletMap.current);
    }

    // Clear existing markers
    if (markersRef.current) markersRef.current.clearLayers();
    markersRef.current = L.layerGroup().addTo(leafletMap.current);

    leads.forEach(lead => {
      const r   = lead.raw_data;
      const lat = parseFloat(String(r.latitude_fim  || r.latitude_inicio  || ''));
      const lon = parseFloat(String(r.longitude_fim || r.longitude_inicio || ''));
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return;

      const region = REGIONS.find(rg => rg.code === lead.region_code);
      const color  = region?.color || '#6b7280';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:10px;height:10px;border-radius:50%;
          background:${color};border:2px solid white;
          box-shadow:0 1px 3px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const nome       = String(r.nome_colaborador || r.nome || '');
      const sobrenome  = String(r.sobrenome_colaborador || '');
      const centroCusto= String(r.centro_custo || '');
      const data       = String(r.data_inicio || '').slice(0, 10);
      const distancia  = r.distancia ? `${r.distancia} km` : '';

      const popup = `
        <div style="font-family:sans-serif;font-size:13px;min-width:200px">
          <div style="font-weight:600;color:#111;margin-bottom:6px">
            ${nome} ${sobrenome}
          </div>
          ${centroCusto ? `<div style="color:#666;font-size:12px;margin-bottom:4px">${centroCusto}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
            ${lead.state_code ? `<span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:500">${lead.state_code}</span>` : ''}
            ${region ? `<span style="background:${color}20;color:${color};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:500">${region.label}</span>` : ''}
            ${distancia ? `<span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:11px">${distancia}</span>` : ''}
          </div>
          ${data ? `<div style="color:#9ca3af;font-size:11px;margin-top:6px">${data}</div>` : ''}
        </div>
      `;

      L.marker([lat, lon], { icon })
        .bindPopup(popup, { maxWidth: 260 })
        .addTo(markersRef.current);
    });
  }, [leafletReady, leads]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-violet-600" />
          <h2 className="text-base font-semibold text-gray-900">Mapa de visitas · Paytrack</h2>
        </div>
        {!loading && (
          <span className="text-sm text-gray-400">{total.toLocaleString('pt-BR')} visitas com localização</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-gray-400" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Todas as regiões</option>
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchLeads} disabled={loading}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
        {REGIONS.map(r => (
          <div key={r.code} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: r.color }} />
            <span className="text-xs text-gray-600">{r.label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
              <span className="text-sm text-gray-600">Carregando visitas...</span>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        {!loading && total === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma visita com coordenadas encontrada</p>
              <p className="text-xs text-gray-300 mt-1">Sincronize os dados da Paytrack primeiro</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
