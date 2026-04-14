// src/types/index.ts

export type RegionCode = 'GO' | 'SUL' | 'NONE' | 'SP' | 'RJ_ES' | 'MG';

export interface Region {
  code: RegionCode;
  label: string;
  states: string[];
  color: string;
  total?: number;
  novos?: number;
  em_andamento?: number;
  concluidos?: number;
}

export type LeadStatus = 'novo' | 'em_andamento' | 'concluido' | 'cancelado';

export interface Lead {
  id: number;
  external_id: string;
  raw_data: Record<string, unknown>;
  state_code: string | null;
  region_code: RegionCode | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  synced_at: string;
  updated_at: string;
}

export interface DashboardStats {
  stats: Region[];
  daily: { dia: string; region_code: string; total: number }[];
  totalLeads: number;
  lastSync: SyncLog | null;
}

export interface SyncLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  error_msg: string | null;
  status: 'running' | 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const REGIONS: Region[] = [
  { code: 'GO',    label: 'Goiás',           states: ['GO','DF','MT','MS'],      color: '#8b5cf6' },
  { code: 'SUL',   label: 'Sul',             states: ['PR','SC','RS'],            color: '#0ea5e9' },
  { code: 'NONE',  label: 'Norte / Nordeste', states: ['AM','PA','AC','RO','RR','AP','TO','MA','PI','CE','RN','PB','PE','AL','SE','BA'], color: '#f97316' },
  { code: 'SP',    label: 'São Paulo',        states: ['SP'],                      color: '#a855f7' },
  { code: 'RJ_ES', label: 'RJ / ES',          states: ['RJ','ES'],                 color: '#eab308' },
  { code: 'MG',    label: 'Minas Gerais',     states: ['MG'],                      color: '#22c55e' },
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novo:          'Novo',
  em_andamento:  'Em andamento',
  concluido:     'Concluído',
  cancelado:     'Cancelado',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  novo:          'bg-blue-100 text-blue-800',
  em_andamento:  'bg-yellow-100 text-yellow-800',
  concluido:     'bg-green-100 text-green-800',
  cancelado:     'bg-red-100 text-red-800',
};
