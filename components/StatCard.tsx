import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, highlight, icon }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-5 flex items-start justify-between transition-all hover:shadow-md hover:border-slate-400">
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className={`text-2xl font-extrabold ${highlight ? 'text-slate-900' : 'text-slate-800'}`}>
          {value}
        </div>
      </div>
      {icon && (
        <div className={`p-3 rounded-lg border ${highlight ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {icon}
        </div>
      )}
    </div>
  );
};

export default StatCard;
