// src/lib/api.ts
// Funções para chamadas às Netlify Functions

import type { DashboardStats, Lead, PaginatedResponse, LeadStatus, RegionCode } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/.netlify/functions';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  /** Busca estatísticas para o dashboard */
  getDashboard: () =>
    request<DashboardStats>('/get-leads?view=dashboard'),

  /** Lista leads paginados com filtros */
  getLeads: (params: {
    region?: RegionCode;
    state?: string;
    status?: LeadStatus;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
    return request<PaginatedResponse<Lead>>(`/get-leads?${qs}`);
  },

  /** Atualiza um lead */
  updateLead: (id: number, body: Partial<Pick<Lead, 'status' | 'assigned_to' | 'notes' | 'region_code'>>) =>
    request<{ success: boolean; data: Lead }>(`/update-lead?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  /** Dispara sincronização com Paytrack */
  syncLeads: () =>
    request<{ success: boolean; fetched: number; inserted: number; updated: number }>(
      '/sync-leads',
      { method: 'POST' }
    ),
};
