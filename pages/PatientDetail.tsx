import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Thermometer, Droplets, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { fetchPatientHistory } from '../services/api';
import { PatientRecord, PredictionDetail } from '../types';
import { ScoreBadge, RiskBadge } from '../components/DashboardWidgets';

const PatientDetail: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      fetchPatientHistory(patientId)
        .then(data => {
            setHistory(data);
            setLoading(false);
        });
        
      // Simple polling for details
      const interval = setInterval(() => {
          fetchPatientHistory(patientId).then(setHistory);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [patientId]);

  const current = history[history.length - 1];

  // Helper to format timestamps for charts
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const chartData = useMemo(() => {
      return history.map(h => ({
          time: formatTime(h.timestamp),
          rawTime: new Date(h.timestamp).getTime(),
          glucose: h.vitals.glucose_mgdl,
          heartRate: h.vitals.heart_rate_bpm,
          spo2: h.vitals.spo2_pct,
          temp: h.vitals.skin_temperature_c,
          riskHypo: h.predictions.hypoglycemia.probability * 100,
          riskCardiac: h.predictions.cardiac.probability * 100,
          riskFall: h.predictions.fall.probability * 100,
      }));
  }, [history]);

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!current) return <div className="p-8">Patient not found</div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <ArrowLeft className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patientId}</h1>
            <p className="text-slate-500 text-sm">Last update: {new Date(current.timestamp).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <span className="text-sm text-slate-500 block">Health Score</span>
                <ScoreBadge score={current.composite_health_score || 0} size="lg" />
            </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Heart size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Heart Rate</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.heart_rate_bpm} <span className="text-sm font-normal text-slate-400">bpm</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Droplets size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Glucose</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.glucose_mgdl} <span className="text-sm font-normal text-slate-400">mg/dL</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><Activity size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">SpO2</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.spo2_pct} <span className="text-sm font-normal text-slate-400">%</span></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Thermometer size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Skin Temp</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.skin_temperature_c.toFixed(1)} <span className="text-sm font-normal text-slate-400">°C</span></div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vitals History */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">Vitals Trends (24h)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate" />
                        <Line yAxisId="left" type="monotone" dataKey="glucose" stroke="#3b82f6" strokeWidth={2} dot={false} name="Glucose" />
                        <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="Temp" />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Risk Probabilities */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">Risk Probability Analysis (%)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" label={{ value: 'Warning', fill: 'red', fontSize: 10 }} />
                        <Area type="monotone" dataKey="riskHypo" stackId="1" stroke="#8884d8" fill="#8884d8" name="Hypoglycemia" />
                        <Area type="monotone" dataKey="riskCardiac" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Cardiac" />
                        <Area type="monotone" dataKey="riskFall" stackId="3" stroke="#ffc658" fill="#ffc658" name="Fall" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Current Predictions Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Current AI Risk Assessments</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               {Object.entries(current.predictions).map(([key, pred]: [string, PredictionDetail]) => (
                   <div key={key} className={`p-4 rounded-lg border ${pred.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                       <p className="text-xs font-bold uppercase text-slate-500 mb-1">{key}</p>
                       <div className="flex justify-between items-end">
                           <span className="text-xl font-bold text-slate-900">{(pred.probability * 100).toFixed(0)}%</span>
                           <RiskBadge level={pred.risk_level} />
                       </div>
                       <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                           <div 
                                className={`h-1.5 rounded-full ${pred.risk_level === 'HIGH' ? 'bg-red-500' : pred.risk_level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                style={{ width: `${pred.probability * 100}%` }}
                            ></div>
                       </div>
                       <p className="text-xs text-slate-400 mt-2">Conf: {(pred.confidence * 100).toFixed(0)}%</p>
                   </div>
               ))}
          </div>
      </div>
    </div>
  );
};

export default PatientDetail;