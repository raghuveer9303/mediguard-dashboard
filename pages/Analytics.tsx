import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PatientRecord } from '../types';

interface AnalyticsProps {
    patients: PatientRecord[];
}

const Analytics: React.FC<AnalyticsProps> = ({ patients }) => {
  // Aggregate average risks
  const riskAverages = React.useMemo(() => {
      if(!patients.length) return [];
      
      const sums = {
          hypoglycemia: 0,
          fall: 0,
          cardiac: 0,
          hypotension: 0,
          autonomic: 0
      };

      patients.forEach(p => {
          sums.hypoglycemia += p.predictions.hypoglycemia.probability;
          sums.fall += p.predictions.fall.probability;
          sums.cardiac += p.predictions.cardiac.probability;
          sums.hypotension += p.predictions.hypotension.probability;
          sums.autonomic += p.predictions.autonomic.probability;
      });

      return Object.entries(sums).map(([key, val]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          avgProb: (val / patients.length) * 100
      }));

  }, [patients]);

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Population Analytics</h1>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Average Risk Probability Across Population</h2>
            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskAverages} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="avgProb" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={40} name="Avg Probability" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm text-slate-500">
                This chart shows the prevalence of specific risk factors across the currently monitored patient population ({patients.length} patients).
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                 <h3 className="font-semibold text-blue-900 mb-2">Export Data</h3>
                 <p className="text-sm text-blue-700 mb-4">Download the current dataset for external analysis.</p>
                 <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Download CSV</button>
             </div>
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                 <h3 className="font-semibold text-slate-900 mb-2">Reports</h3>
                 <p className="text-sm text-slate-600 mb-4">Generate weekly PDF summary reports.</p>
                 <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-medium">Generate Report</button>
             </div>
        </div>
    </div>
  );
};

export default Analytics;
