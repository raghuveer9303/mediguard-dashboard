import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean; // true for good (green), false for bad (red)
  color: 'blue' | 'red' | 'green' | 'orange';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, trend, trendUp, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
};

export const ScoreBadge: React.FC<{ score: number; size?: 'sm' | 'lg' }> = ({ score, size = 'sm' }) => {
  let colorClass = 'bg-slate-100 text-slate-800';
  if (score >= 80) colorClass = 'bg-green-100 text-green-800 border-green-200';
  else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  else if (score >= 40) colorClass = 'bg-orange-100 text-orange-800 border-orange-200';
  else colorClass = 'bg-red-100 text-red-800 border-red-200';

  const sizeClass = size === 'lg' ? 'px-4 py-2 text-2xl font-bold' : 'px-2.5 py-0.5 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center justify-center rounded-full border ${colorClass} ${sizeClass}`}>
      {score}
    </span>
  );
};

export const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  let colorClass = 'bg-slate-100 text-slate-800';
  if (level === 'LOW') colorClass = 'bg-green-100 text-green-800';
  if (level === 'MEDIUM') colorClass = 'bg-yellow-100 text-yellow-800';
  if (level === 'HIGH') colorClass = 'bg-red-100 text-red-800 animate-pulse';

  return (
    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${colorClass}`}>
      {level}
    </span>
  );
};
