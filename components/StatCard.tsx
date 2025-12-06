import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: React.ReactNode;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, highlight, icon, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 p-4 flex flex-col justify-between h-full transition-all hover:border-emerald-500/30 hover:shadow-md relative overflow-hidden group">
      {highlight && (
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        {icon && (
          <div className={`p-1.5 rounded-md ${highlight ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
            {React.cloneElement(icon as React.ReactElement, { size: 16 })}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-slate-900' : 'text-slate-700'}`}>
          {value}
        </div>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;