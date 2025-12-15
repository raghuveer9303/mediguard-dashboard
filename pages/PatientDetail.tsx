import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Thermometer, Droplets, Heart, TrendingUp, TrendingDown, Minus, Footprints, Battery, Brain, Wind } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
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

  // Calculate Time in Range (TIR) - Critical CGM metric
  const timeInRange = useMemo(() => {
    if (history.length === 0) return { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0 };
    
    const ranges = { veryLow: 0, low: 0, inRange: 0, high: 0, veryHigh: 0 };
    history.forEach(h => {
      const glucose = h.vitals.glucose_mgdl;
      if (glucose < 70) ranges.veryLow++;
      else if (glucose < 80) ranges.low++;
      else if (glucose <= 180) ranges.inRange++;
      else if (glucose <= 250) ranges.high++;
      else ranges.veryHigh++;
    });
    
    const total = history.length;
    return {
      veryLow: Math.round((ranges.veryLow / total) * 100),
      low: Math.round((ranges.low / total) * 100),
      inRange: Math.round((ranges.inRange / total) * 100),
      high: Math.round((ranges.high / total) * 100),
      veryHigh: Math.round((ranges.veryHigh / total) * 100),
    };
  }, [history]);

  // Calculate glucose variability (CV - Coefficient of Variation)
  const glucoseVariability = useMemo(() => {
    if (history.length === 0) return { cv: 0, std: 0, mean: 0 };
    
    const values = history.map(h => h.vitals.glucose_mgdl);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const cv = (std / mean) * 100;
    
    return { cv: cv.toFixed(1), std: std.toFixed(1), mean: mean.toFixed(0) };
  }, [history]);

  // Activity metrics
  const activityMetrics = useMemo(() => {
    if (history.length === 0) return { avgSteps: 0, maxSteps: 0, activeTime: 0 };
    
    const avgSteps = history.reduce((a, h) => a + h.vitals.steps_per_minute, 0) / history.length;
    const maxSteps = Math.max(...history.map(h => h.vitals.steps_per_minute));
    const activeTime = history.filter(h => h.vitals.steps_per_minute > 5).length;
    
    return {
      avgSteps: avgSteps.toFixed(1),
      maxSteps: maxSteps.toFixed(0),
      activeTime: Math.round((activeTime / history.length) * 100),
    };
  }, [history]);

  const chartData = useMemo(() => {
      return history.map(h => ({
          time: formatTime(h.timestamp),
          rawTime: new Date(h.timestamp).getTime(),
          glucose: h.vitals.glucose_mgdl,
          heartRate: h.vitals.heart_rate_bpm,
          spo2: h.vitals.spo2_pct,
          temp: h.vitals.skin_temperature_c,
          steps: h.vitals.steps_per_minute,
          hrv: h.vitals.hrv_sdnn,
          respiratory: h.vitals.respiratory_rate_rpm,
          riskHypo: h.predictions.hypoglycemia.probability * 100,
          riskCardiac: h.predictions.cardiac.probability * 100,
          riskFall: h.predictions.fall.probability * 100,
          riskHypotension: h.predictions.hypotension.probability * 100,
          riskAutonomic: h.predictions.autonomic.probability * 100,
      }));
  }, [history]);

  // Data for TIR pie chart
  const tirPieData = [
    { name: 'In Range', value: timeInRange.inRange, color: '#10b981' },
    { name: 'High', value: timeInRange.high, color: '#f59e0b' },
    { name: 'Very High', value: timeInRange.veryHigh, color: '#ef4444' },
    { name: 'Low', value: timeInRange.low, color: '#fbbf24' },
    { name: 'Very Low', value: timeInRange.veryLow, color: '#dc2626' },
  ].filter(d => d.value > 0);

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

      {/* CGM Summary Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Continuous Glucose Monitoring (24h)</h2>
            <p className="text-sm text-slate-600">Time in Range analysis and glycemic variability metrics</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-green-600">{timeInRange.inRange}%</div>
              <div className="text-xs text-slate-500 font-medium">Time in Range</div>
              <div className="text-[10px] text-slate-400">Target: &gt;70%</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-slate-700">{glucoseVariability.cv}%</div>
              <div className="text-xs text-slate-500 font-medium">Glucose CV</div>
              <div className="text-[10px] text-slate-400">Target: &lt;36%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Grid - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Heart size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Heart Rate</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.heart_rate_bpm.toFixed(0)} <span className="text-sm font-normal text-slate-400">bpm</span></div>
            <div className="text-xs text-slate-400 mt-1">HRV: {current.vitals.hrv_sdnn.toFixed(0)} ms</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Droplets size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Glucose</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.glucose_mgdl.toFixed(0)} <span className="text-sm font-normal text-slate-400">mg/dL</span></div>
            <div className="text-xs text-slate-400 mt-1">Mean: {glucoseVariability.mean}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><Activity size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">SpO2</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.spo2_pct.toFixed(0)} <span className="text-sm font-normal text-slate-400">%</span></div>
            <div className="text-xs text-slate-400 mt-1">Normal</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Thermometer size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Skin Temp</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.skin_temperature_c.toFixed(1)} <span className="text-sm font-normal text-slate-400">°C</span></div>
            <div className="text-xs text-slate-400 mt-1">Normal</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Footprints size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Activity</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.steps_per_minute.toFixed(0)} <span className="text-sm font-normal text-slate-400">spm</span></div>
            <div className="text-xs text-slate-400 mt-1">Avg: {activityMetrics.avgSteps}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Wind size={20} /></div>
                <span className="text-slate-500 font-medium text-sm">Respiration</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{current.vitals.respiratory_rate_rpm.toFixed(0)} <span className="text-sm font-normal text-slate-400">rpm</span></div>
            <div className="text-xs text-slate-400 mt-1">Normal</div>
        </div>
      </div>

      {/* Main Charts - Enhanced Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time in Range Visualization */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Time in Range (TIR)</h3>
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={tirPieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}%`}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {tirPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">In Range (80-180)</span>
                    <span className="font-bold text-green-600">{timeInRange.inRange}%</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Above Range (&gt;180)</span>
                    <span className="font-bold text-orange-600">{timeInRange.high + timeInRange.veryHigh}%</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Below Range (&lt;80)</span>
                    <span className="font-bold text-red-600">{timeInRange.low + timeInRange.veryLow}%</span>
                </div>
              </div>
          </div>

          {/* Activity Pattern */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Activity & Movement</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} interval="preserveEnd" />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="steps" fill="#8b5cf6" name="Steps/min" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Avg Steps/min</span>
                    <span className="font-bold text-slate-700">{activityMetrics.avgSteps}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Active Time</span>
                    <span className="font-bold text-purple-600">{activityMetrics.activeTime}%</span>
                </div>
              </div>
          </div>

          {/* Cardiac Monitoring */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">Cardiac Health</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} interval="preserveEnd" />
                        <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{fontSize: '11px'}} />
                        <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} name="HR (bpm)" />
                        <Line yAxisId="right" type="monotone" dataKey="hrv" stroke="#10b981" strokeWidth={2} dot={false} name="HRV (ms)" />
                    </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                Higher HRV indicates better autonomic function
              </div>
          </div>
      </div>

      {/* Detailed Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CGM Trend with Target Ranges */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">Glucose Trend with Target Ranges (24h)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={[50, 250]} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Low', fill: '#dc2626', fontSize: 10, position: 'left' }} />
                        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target', fill: '#10b981', fontSize: 10, position: 'left' }} />
                        <ReferenceLine y={180} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target', fill: '#10b981', fontSize: 10, position: 'left' }} />
                        <ReferenceLine y={250} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'High', fill: '#f59e0b', fontSize: 10, position: 'left' }} />
                        <Line type="monotone" dataKey="glucose" stroke="#3b82f6" strokeWidth={3} dot={false} name="Glucose (mg/dL)" />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Risk Probabilities */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-6">AI Risk Assessment Trends (%)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} interval="preserveStartEnd" minTickGap={30} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{fontSize: '11px'}} />
                        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Medium Risk', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'High Risk', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="riskHypo" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Hypoglycemia" />
                        <Line type="monotone" dataKey="riskCardiac" stroke="#ef4444" strokeWidth={2} dot={false} name="Cardiac" />
                        <Line type="monotone" dataKey="riskFall" stroke="#f59e0b" strokeWidth={2} dot={false} name="Fall" />
                        <Line type="monotone" dataKey="riskHypotension" stroke="#06b6d4" strokeWidth={2} dot={false} name="Hypotension" />
                        <Line type="monotone" dataKey="riskAutonomic" stroke="#10b981" strokeWidth={2} dot={false} name="Autonomic" />
                    </LineChart>
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