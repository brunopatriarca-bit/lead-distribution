// src/pages/ImportPage.tsx
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

type Stage = 'idle' | 'parsed' | 'importing' | 'done' | 'error';

export default function ImportPage() {
  const [stage, setStage]         = useState<Stage>('idle');
  const [parsed, setParsed]       = useState<ParsedData | null>(null);
  const [ufCol, setUfCol]         = useState('');
  const [nameCol, setNameCol]     = useState('');
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
        const headers = rows.length ? Object.keys(rows[0]) : [];

        // Auto-detectar colunas de UF e nome
        const ufGuess   = headers.find(h => /^(uf|estado|state|sg_uf)$/i.test(h)) || '';
        const nameGuess = headers.find(h => /raz[aã]o|nome|name|empresa|company/i.test(h)) || '';

        setParsed({ headers, rows, fileName: file.name });
        setUfCol(ufGuess);
        setNameCol(nameGuess);
        setStage('parsed');
      } catch {
        setError('Erro ao ler o arquivo. Certifique-se que é .xlsx ou .xls');
        setStage('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setStage('importing');
    try {
      const res = await fetch(`${API}/import-neoway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows, ufColumn: ufCol, nameColumn: nameCol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no servidor');
      setResult(data);
      setStage('done');
    } catch (e: any) {
      setError(e.message);
      setStage('error');
    }
  };

  const reset = () => { setStage('idle'); setParsed(null); setResult(null); setError(''); };

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Importar leads · Neoway</h2>
        <p className="text-sm text-gray-400 mt-1">Importe planilhas .xlsx exportadas da Neoway</p>
      </div>

      {/* IDLE: drop zone */}
      {stage === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragging ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
            <FileSpreadsheet size={22} className="text-violet-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Arraste o arquivo aqui ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx ou .xls · qualquer exportação da Neoway</p>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
        </div>
      )}

      {/* PARSED: column mapping */}
      {stage === 'parsed' && parsed && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <span className="font-medium">{parsed.fileName}</span>
              {' '}· {parsed.rows.length.toLocaleString('pt-BR')} registros · {parsed.headers.length} colunas
            </div>
            <button onClick={reset} className="ml-auto text-green-600 hover:text-green-800"><X size={16} /></button>
          </div>

          {/* Column mapping */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-sm font-medium text-gray-700">Mapeamento de colunas</p>
            <ColSelect label="Coluna de UF / Estado" value={ufCol} onChange={setUfCol} headers={parsed.headers}
              hint="Ex: UF, Estado, sg_uf" />
            <ColSelect label="Coluna de nome / empresa" value={nameCol} onChange={setNameCol} headers={parsed.headers}
              hint="Ex: Razão Social, Nome, empresa" />
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500">Prévia — primeiras 3 linhas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {parsed.headers.slice(0, 6).map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                    {parsed.headers.length > 6 && <th className="px-4 py-2 text-gray-400">+{parsed.headers.length - 6}</th>}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      {parsed.headers.slice(0, 6).map(h => (
                        <td key={h} className="px-4 py-2 text-gray-600 whitespace-nowrap max-w-32 truncate">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleImport}
              className="flex-1 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">
              Importar {parsed.rows.length.toLocaleString('pt-BR')} registros
            </button>
          </div>
        </div>
      )}

      {/* IMPORTING */}
      {stage === 'importing' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          <p className="text-sm text-gray-500">Importando {parsed?.rows.length.toLocaleString('pt-BR')} registros...</p>
        </div>
      )}

      {/* DONE */}
      {stage === 'done' && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-600" />
              <span className="font-medium text-green-900">Importação concluída!</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Inseridos"   value={result.inserted} color="green" />
              <Stat label="Atualizados" value={result.updated}  color="blue"  />
              <Stat label="Ignorados"   value={result.skipped}  color="gray"  />
            </div>
          </div>
          <button onClick={reset}
            className="w-full py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Importar outro arquivo
          </button>
        </div>
      )}

      {/* ERROR */}
      {stage === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm text-red-800">{error}</div>
          <button onClick={reset} className="text-red-600 hover:text-red-800"><X size={16} /></button>
        </div>
      )}

      {/* Tips */}
      {stage === 'idle' && (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 space-y-1">
          <p className="font-medium text-gray-700 mb-2">Colunas detectadas automaticamente:</p>
          <p>· <code className="bg-gray-200 px-1 rounded text-xs">UF</code> ou <code className="bg-gray-200 px-1 rounded text-xs">Estado</code> → região do sistema</p>
          <p>· <code className="bg-gray-200 px-1 rounded text-xs">CNPJ</code> ou <code className="bg-gray-200 px-1 rounded text-xs">CPF</code> → chave única (evita duplicatas)</p>
          <p>· Todas as outras colunas são salvas integralmente para consulta</p>
        </div>
      )}
    </div>
  );
}

function ColSelect({ label, value, onChange, headers, hint }: {
  label: string; value: string; onChange: (v: string) => void; headers: string[]; hint: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">— não mapear —</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    blue:  'bg-blue-100 text-blue-800',
    gray:  'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
