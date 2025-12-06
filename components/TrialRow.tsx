import React, { useState } from 'react';
import { Trial } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TrialRowProps {
  trial: Trial;
}

const TrialRow: React.FC<TrialRowProps> = ({ trial }) => {
  const [expanded, setExpanded] = useState(false);

  const getProductBadgeColor = (product: string) => {
    const p = product.toLowerCase();
    if (p.includes('lst')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (p.includes('powerplant')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (p.includes('triune')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (p.includes('triphase')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const productBadge = trial.Product !== 'NutriCharge' ? (
    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getProductBadgeColor(trial.Product)}`}>
      {trial.Product}
    </span>
  ) : null;

  const advColor = trial.Advantage_pct > 0 ? 'text-emerald-700' : trial.Advantage_pct < 0 ? 'text-red-600' : 'text-slate-500';

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)} 
        className={`group cursor-pointer transition-colors border-b border-slate-200 last:border-0 hover:bg-slate-50 ${expanded ? 'bg-slate-50' : ''}`}
      >
        <td className="p-4 pl-6 font-semibold text-slate-800">
          <div className="flex items-center">
            {expanded ? <ChevronUp size={16} className="text-slate-500 mr-3" /> : <ChevronDown size={16} className="text-slate-400 mr-3" />}
            {trial.Crop}
            {productBadge}
          </div>
        </td>
        <td className="p-4 text-slate-700 font-medium">{trial.Year}</td>
        <td className="p-4 text-slate-700">
          {trial.Location}
          {trial.Country && trial.Country !== 'USA' && <span className="text-xs text-slate-500 font-medium ml-1">({trial.Country})</span>}
        </td>
        <td className="p-4 text-slate-600 text-sm max-w-xs truncate font-medium" title={trial.Treatment}>{trial.Treatment || 'NutriCharge'}</td>
        <td className="p-4 pr-6 text-right">
          <div className={`font-bold ${advColor}`}>
            {trial.Advantage_pct > 0 ? '+' : ''}{trial.Advantage_pct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {trial.Advantage_bu > 0 ? '+' : ''}{trial.Advantage_bu.toFixed(1)} {trial.Unit || 'bu/ac'}
          </div>
        </td>
      </tr>
      
      {expanded && (
        <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
          <td colSpan={5} className="p-0">
            <div className="p-6 pl-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm animate-fadeIn">
              <div>
                <span className="block text-slate-500 text-xs uppercase font-bold mb-1">NC Yield</span>
                <span className="text-lg font-bold text-slate-900">{trial.NC_Yield} <span className="text-sm font-medium text-slate-500">{trial.Unit}</span></span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase font-bold mb-1">Check Yield</span>
                <span className="text-lg font-bold text-slate-900">{trial.Check_Yield} <span className="text-sm font-medium text-slate-500">{trial.Unit}</span></span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase font-bold mb-1">Advantage</span>
                <span className={`text-lg font-bold ${advColor}`}>
                   {trial.Advantage_bu > 0 ? '+' : ''}{trial.Advantage_bu.toFixed(2)} <span className="text-sm font-medium opacity-70">{trial.Unit}</span>
                </span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs uppercase font-bold mb-1">Variety</span>
                <span className="font-bold text-slate-800">{trial.Variety || '—'}</span>
              </div>
              {trial.Notes && (
                <div className="sm:col-span-2 lg:col-span-4 mt-2 p-4 bg-white rounded-lg border border-slate-300 shadow-sm">
                  <span className="font-bold text-slate-800 mr-2 block mb-1">Trial Notes:</span>
                  <span className="text-slate-700 leading-relaxed font-medium">{trial.Notes}</span>
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
