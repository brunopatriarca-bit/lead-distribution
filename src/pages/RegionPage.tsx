// src/pages/RegionPage.tsx
import { REGIONS } from '../types';

export default function RegionPage() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Regiões de atendimento</h2>
      <div className="grid grid-cols-2 gap-4">
        {REGIONS.map(r => (
          <div key={r.code} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="font-semibold text-gray-900">{r.label}</span>
              <code className="ml-auto text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{r.code}</code>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.states.map(s => (
                <span key={s} className="text-xs font-mono px-2 py-0.5 rounded-md border"
                  style={{ borderColor: r.color + '40', color: r.color, backgroundColor: r.color + '10' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
