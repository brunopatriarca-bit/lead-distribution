// src/pages/MapPage.tsx
import { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, RefreshCw, Calendar } from 'lucide-react';
import { REGIONS } from '../types';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';
const MONTHS = [
  {v:'1',l:'Janeiro'},{v:'2',l:'Fevereiro'},{v:'3',l:'Março'},{v:'4',l:'Abril'},
  {v:'5',l:'Maio'},{v:'6',l:'Junho'},{v:'7',l:'Julho'},{v:'8',l:'Agosto'},
  {v:'9',l:'Setembro'},{v:'10',l:'Outubro'},{v:'11',l:'Novembro'},{v:'12',l:'Dezembro'},
];
const currentYear  = new Date().getFullYear();
const currentMonth = String(new Date().getMonth()+1);
const YEARS = [currentYear, currentYear-1, currentYear-2].map(String);
declare global { interface Window { L: any } }

export default function MapPage() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [leads, setLeads]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('');
  const [month, setMonth]           = useState(currentMonth);
  const [year, setYear]             = useState(String(currentYear));
  const [total, setTotal]           = useState(0);
  const [leafletReady, setLeafletReady] = useState(false);

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
  },[]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ view:'map', limit:'500', page:'1' });
      if (filter) qs.set('region', filter);
      if (month)  qs.set('month', month);
      if (year)   qs.set('year', year);
      const res  = await fetch(`${API}/get-leads?${qs}`);
      const data = await res.json();
      const all  = (data.data||[]).filter((l:any)=>{
        const r=l.raw_data;
        return (r.latitude_fim||r.latitude_inicio)&&(r.longitude_fim||r.longitude_inicio);
      });
      setLeads(all); setTotal(all.length);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchLeads(); },[filter,month,year]);

  useEffect(()=>{
    if(!leafletReady||!mapRef.current||leads.length===0) return;
    const L=window.L; if(!L) return;
    if(!leafletMap.current){
      leafletMap.current=L.map(mapRef.current,{zoomControl:true}).setView([-15.77,-47.92],5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(leafletMap.current);
    }
    if(markersRef.current) markersRef.current.clearLayers();
    markersRef.current=L.layerGroup().addTo(leafletMap.current);
    leads.forEach(lead=>{
      const r=lead.raw_data;
      const lat=parseFloat(String(r.latitude_fim||r.latitude_inicio||''));
      const lon=parseFloat(String(r.longitude_fim||r.longitude_inicio||''));
      if(isNaN(lat)||isNaN(lon)||lat===0||lon===0) return;
      const region=REGIONS.find(rg=>rg.code===lead.region_code);
      const color=region?.color||'#6b7280';
      const icon=L.divIcon({className:'',html:`<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,iconSize:[10,10],iconAnchor:[5,5]});
      const nome=[String(r.nome_colaborador||'').trim(),String(r.sobrenome_colaborador||'').trim()].filter(Boolean).join(' ')||'—';
      const visita=String(r.justificativa||r.desc_servico||'').trim();
      const custo=String(r.centro_custo||'').trim();
      const data=String(r.data_inicio||'').slice(0,10).split('-').reverse().join('/');
      const dist=r.distancia?`${r.distancia} km`:'';
      const tipo=String(r.tipo||'').trim();
      L.marker([lat,lon],{icon}).bindPopup(`
        <div style="font-family:sans-serif;font-size:13px;min-width:220px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:${color}">
              ${nome.split(' ').slice(0,2).map((n:string)=>n[0]).join('')}
            </div>
            <div><div style="font-weight:600;color:#111">${nome}</div>${region?`<div style="font-size:11px;color:${color}">${region.label}</div>`:''}</div>
          </div>
          ${visita?`<div style="background:#f8f9fa;border-radius:6px;padding:6px 10px;margin-bottom:8px"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px">Visita</div><div style="font-weight:500;color:#374151;font-size:12px">${visita}</div></div>`:''}
          ${custo?`<div style="font-size:11px;color:#6b7280;margin-bottom:6px">${custo}</div>`:''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            ${lead.state_code?`<span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:500">${lead.state_code}</span>`:''}
            ${tipo?`<span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:11px;color:#6b7280">${tipo}</span>`:''}
            ${dist?`<span style="background:#eff6ff;border-radius:4px;padding:2px 8px;font-size:11px;color:#3b82f6">${dist}</span>`:''}
          </div>
          ${data?`<div style="color:#9ca3af;font-size:11px">${data}</div>`:''}
        </div>`,{maxWidth:260}).addTo(markersRef.current);
    });
  },[leafletReady,leads]);

  const monthLabel=MONTHS.find(m=>m.v===month)?.l||'';
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh'}}>
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-2"><MapPin size={17} className="text-violet-600"/><h2 className="text-base font-semibold text-gray-900">Mapa de visitas</h2></div>
        {!loading&&<span className="text-sm text-gray-400">{total.toLocaleString('pt-BR')} visitas</span>}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            <Calendar size={13} className="text-gray-400"/>
            <select value={month} onChange={e=>setMonth(e.target.value)} className="text-sm bg-transparent focus:outline-none">
              {MONTHS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <select value={year} onChange={e=>setYear(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-gray-400"/>
            <select value={filter} onChange={e=>setFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
              <option value="">Todas as regiões</option>
              {REGIONS.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <button onClick={fetchLeads} disabled={loading} className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading?'animate-spin':''}/> Atualizar
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">{monthLabel} {year}</span>
        {REGIONS.map(r=>(
          <div key={r.code} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{backgroundColor:r.color}}/>
            <span className="text-xs text-gray-600">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 relative">
        {loading&&(<div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600"/><span className="text-sm text-gray-600">Carregando {monthLabel} {year}...</span></div>
        </div>)}
        <div ref={mapRef} style={{height:'100%',width:'100%'}}/>
        {!loading&&total===0&&(
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><MapPin size={32} className="text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-400">Nenhuma visita em {monthLabel} {year}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
