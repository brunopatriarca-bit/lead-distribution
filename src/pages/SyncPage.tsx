// src/pages/SyncPage.tsx
import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function SyncPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ fetched: number; inserted: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await api.syncLeads();
      setResult(res);
      setStatus('success');
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-lg space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Sincronizar Paytrack</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="text-sm text-gray-500 space-y-1">
          <p><span className="font-medium text-gray-700">Endpoint:</span> view_omnilink_despesas_quilometragem</p>
          <p><span className="font-medium text-gray-700">Database:</span> paytrack_omnilink</p>
          <p><span className="font-medium text-gray-700">Auth:</span> Basic (configurado via variáveis de ambiente)</p>
        </div>
        <button
          onClick={handleSync}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={15} className={status === 'loading' ? 'animate-spin' : ''} />
          {status === 'loading' ? 'Sincronizando...' : 'Iniciar sincronização'}
        </button>

        {status === 'success' && result && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Sincronizado com sucesso</p>
              <p className="mt-1 text-green-700">
                {result.fetched} buscados · {result.inserted} inseridos · {result.updated} atualizados
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Erro na sincronização</p>
              <p className="mt-1 text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Agendamento automático (opcional)</p>
        <p>No painel Netlify, configure um Scheduled Function chamando <code className="bg-amber-100 px-1 rounded">sync-leads</code> com a frequência desejada (ex: a cada hora).</p>
      </div>
    </div>
  );
}
