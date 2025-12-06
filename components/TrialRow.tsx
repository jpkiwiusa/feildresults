import React, { useState } from 'react';
import { Trial } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TrialRowProps {
  trial: Trial;
}

const TrialRow: React.FC<TrialRowProps> = ({ trial }) => {
  const [expanded, setExpanded] = useState(false);

  const getProductBadgeColor = (product: string) => {
    const p = product.toLowerCase();
    if (p.includes('lst')) return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';
    if (p.includes('powerplant')) return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10';
    if (p.includes('triune')) return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';
    if (p.includes('triphase')) return 'bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-500/10';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';
  };

  const productBadge = trial.Product !== 'NutriCharge' ? (
    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ring-1 ${getProductBadgeColor(trial.Product)}`}>
      {trial.Product.replace('NutriCharge', 'NC')}
    </span>
  ) : null;

  const advColor = trial.Advantage_pct > 0 ? 'text-emerald-700' : trial.Advantage_pct < 0 ? 'text-red-600' : 'text-slate-500';
  const advBg = trial.Advantage_pct > 0 ? 'bg-emerald-50/50' : trial.Advantage_pct < 0 ? 'bg-red-50/50' : '';

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)} 
        className={`group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-sm ${expanded ? 'bg-slate-50' : ''}`}
      >
        <td className="py-3 pl-4 pr-2 w-8 text-center">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-400" />}
        </td>
        <td className="py-3 pr-4 font-semibold text-slate-800">
          <div className="flex items-center">
            {trial.Crop}
            {productBadge}
          </div>
        </td>
        <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">{trial.Year}</td>
        <td className="py-3 px-4 text-slate-600">
          <div className="flex flex-col">
            <span className="font-medium text-slate-700">{trial.Location}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">{trial.State || trial.Country}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-slate-600 font-medium truncate max-w-[200px]" title={trial.Treatment}>
            {trial.Treatment || 'NutriCharge'}
        </td>
        <td className={`py-3 px-4 pr-6 text-right ${advBg}`}>
          <div className={`font-bold tabular-nums ${advColor}`}>
            {trial.Advantage_pct > 0 ? '+' : ''}{trial.Advantage_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium tabular-nums">
            {trial.Advantage_bu > 0 ? '+' : ''}{trial.Advantage_bu.toFixed(1)} {trial.Unit || 'bu/ac'}
          </div>
        </td>
      </tr>
      
      {expanded && (
        <tr className="bg-slate-50/50 border-b border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <td colSpan={6} className="p-0">
            <div className="p-4 pl-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">NC Yield</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">{trial.NC_Yield} <span className="text-xs font-normal text-slate-500">{trial.Unit}</span></span>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Check Yield</span>
                <span className="text-lg font-bold text-slate-700 tabular-nums">{trial.Check_Yield} <span className="text-xs font-normal text-slate-500">{trial.Unit}</span></span>
              </div>
              <div className={`bg-white p-3 rounded border shadow-sm ${trial.Advantage_bu > 0 ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-200'}`}>
                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Advantage</span>
                <span className={`text-lg font-bold tabular-nums ${advColor}`}>
                   {trial.Advantage_bu > 0 ? '+' : ''}{trial.Advantage_bu.toFixed(2)} <span className="text-xs font-normal text-slate-500">{trial.Unit}</span>
                </span>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Variety</span>
                <span className="font-semibold text-slate-800">{trial.Variety || '—'}</span>
              </div>
              {trial.Notes && (
                <div className="sm:col-span-2 lg:col-span-4 mt-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Trial Notes</span>
                  <p className="text-slate-600 bg-white p-3 rounded border border-slate-200 text-sm leading-relaxed">{trial.Notes}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default TrialRow;