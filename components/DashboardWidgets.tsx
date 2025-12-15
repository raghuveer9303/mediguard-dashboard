import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean; // true for good (green), false for bad (red)
  color: 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'teal' | 'cyan';
  subtitle?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, trend, trendUp, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
    cyan: 'bg-cyan-50 text-cyan-600',
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
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
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

// New: Glucose Distribution Mini Chart
interface GlucoseDistributionProps {
  patients: any[];
}

export const GlucoseDistribution: React.FC<GlucoseDistributionProps> = ({ patients }) => {
  // Calculate glucose ranges (Time in Range concept)
  const ranges = {
    veryLow: 0,  // < 70 mg/dL
    low: 0,      // 70-80 mg/dL
    inRange: 0,  // 80-180 mg/dL
    high: 0,     // 180-250 mg/dL
    veryHigh: 0, // > 250 mg/dL
  };

  patients.forEach(p => {
    const glucose = p.vitals.glucose_mgdl;
    if (glucose < 70) ranges.veryLow++;
    else if (glucose < 80) ranges.low++;
    else if (glucose <= 180) ranges.inRange++;
    else if (glucose <= 250) ranges.high++;
    else ranges.veryHigh++;
  });

  const total = patients.length || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-slate-800 font-semibold mb-4">Population Glucose Distribution</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            Critical Low (&lt;70)
          </span>
          <span className="font-bold text-slate-900">{ranges.veryLow} ({((ranges.veryLow/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-red-500 h-2 rounded-full" style={{width: `${(ranges.veryLow/total)*100}%`}}></div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
            Low (70-80)
          </span>
          <span className="font-bold text-slate-900">{ranges.low} ({((ranges.low/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-yellow-500 h-2 rounded-full" style={{width: `${(ranges.low/total)*100}%`}}></div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            Target Range (80-180)
          </span>
          <span className="font-bold text-green-700">{ranges.inRange} ({((ranges.inRange/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{width: `${(ranges.inRange/total)*100}%`}}></div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
            High (180-250)
          </span>
          <span className="font-bold text-slate-900">{ranges.high} ({((ranges.high/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full" style={{width: `${(ranges.high/total)*100}%`}}></div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-600 mr-2"></span>
            Critical High (&gt;250)
          </span>
          <span className="font-bold text-slate-900">{ranges.veryHigh} ({((ranges.veryHigh/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-red-600 h-2 rounded-full" style={{width: `${(ranges.veryHigh/total)*100}%`}}></div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Time in Range (TIR)</span>
          <span className="text-lg font-bold text-green-600">{((ranges.inRange/total)*100).toFixed(1)}%</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Target: &gt;70% for optimal glycemic control</p>
      </div>
    </div>
  );
};

// New: Risk Matrix Heatmap
interface RiskMatrixProps {
  patients: any[];
  settings: any;
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ patients, settings }) => {
  const riskTypes = ['hypoglycemia', 'cardiac', 'fall', 'hypotension', 'autonomic'];
  const riskLabels = ['Hypo', 'Cardiac', 'Fall', 'Hypotn', 'Auto'];
  
  const calculateRiskCount = (riskType: string, level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    return patients.filter(p => {
      const pred = p.predictions[riskType];
      return pred && pred.risk_level === level;
    }).length;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-slate-800 font-semibold mb-4">Risk Matrix Overview</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-slate-500 font-medium">Risk Type</th>
              <th className="text-center py-2 text-slate-500 font-medium">High</th>
              <th className="text-center py-2 text-slate-500 font-medium">Medium</th>
              <th className="text-center py-2 text-slate-500 font-medium">Low</th>
              <th className="text-center py-2 text-slate-500 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {riskTypes.map((risk, idx) => {
              const high = calculateRiskCount(risk, 'HIGH');
              const medium = calculateRiskCount(risk, 'MEDIUM');
              const low = calculateRiskCount(risk, 'LOW');
              const total = high + medium + low;
              
              return (
                <tr key={risk} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-700 capitalize">{riskLabels[idx]}</td>
                  <td className="text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-8 rounded ${high > 0 ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      {high}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-8 rounded ${medium > 0 ? 'bg-yellow-100 text-yellow-700 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      {medium}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-8 rounded ${low > 0 ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      {low}
                    </span>
                  </td>
                  <td className="text-center font-bold text-slate-700">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-3">Click on patient for detailed risk analysis</p>
    </div>
  );
};

// New: Vital Signs Summary
interface VitalsOverviewProps {
  patients: any[];
}

export const VitalsOverview: React.FC<VitalsOverviewProps> = ({ patients }) => {
  if (patients.length === 0) return null;

  const calculateStats = (key: keyof any) => {
    const values = patients.map(p => p.vitals[key]).filter(v => v !== undefined);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { avg, min, max };
  };

  const hrStats = calculateStats('heart_rate_bpm');
  const glucoseStats = calculateStats('glucose_mgdl');
  const spo2Stats = calculateStats('spo2_pct');
  const tempStats = calculateStats('skin_temperature_c');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-slate-800 font-semibold mb-4">Population Vital Signs</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Heart Rate</span>
            <span className="text-xs text-slate-400">bpm</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{hrStats.avg.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Range: {hrStats.min.toFixed(0)} - {hrStats.max.toFixed(0)}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Glucose</span>
            <span className="text-xs text-slate-400">mg/dL</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{glucoseStats.avg.toFixed(0)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Range: {glucoseStats.min.toFixed(0)} - {glucoseStats.max.toFixed(0)}
          </div>
        </div>

        <div className="bg-cyan-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">SpO2</span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{spo2Stats.avg.toFixed(1)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Range: {spo2Stats.min.toFixed(0)} - {spo2Stats.max.toFixed(0)}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Temperature</span>
            <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{tempStats.avg.toFixed(1)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Range: {tempStats.min.toFixed(1)} - {tempStats.max.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};
