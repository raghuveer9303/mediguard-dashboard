import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Activity, Heart, ArrowRight, Search, Filter, X, Bell, TrendingUp, Droplets, Zap } from 'lucide-react';
import { PatientRecord, DashboardStats, PredictionDetail, AppSettings } from '../types';
import { SummaryCard, RiskBadge, GlucoseDistribution, RiskMatrix, VitalsOverview, RiskDistributionPieChart } from '../components/DashboardWidgets';

interface DashboardProps {
  patients: PatientRecord[];
  lastUpdated: Date;
  loading: boolean;
  settings: AppSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ patients, lastUpdated, loading, settings }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  // Alert feed filters
  const [alertRiskTypeFilter, setAlertRiskTypeFilter] = useState<'ALL' | 'hypoglycemia' | 'cardiac' | 'fall' | 'hypotension' | 'autonomic'>('ALL');
  const [alertScoreThreshold, setAlertScoreThreshold] = useState<number>(100); // Show alerts below this score

  // Helper to find the relevant highest risk based on SETTINGS
  const getRelevantHighestRisk = (patient: PatientRecord): [string, PredictionDetail] | null => {
    const validRisks = (Object.entries(patient.predictions) as [string, PredictionDetail][])
      .filter(([key, detail]) => {
         // Check if risk type is enabled
         const isEnabled = settings.enabledRisks[key as keyof typeof settings.enabledRisks];
         // Check if probability meets threshold
         const meetsThreshold = (detail.probability * 100) >= settings.minProbabilityThreshold;
         return isEnabled && meetsThreshold;
      });

    if (validRisks.length === 0) return null;

    return validRisks.reduce((prev, curr) => (curr[1].probability > prev[1].probability ? curr : prev));
  };

  // --- Filtering Logic ---
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Search Filter
      const matchesSearch = patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Get highest risk respecting global settings
      const highestRiskEntry = getRelevantHighestRisk(patient);
      
      // Risk Filter (Dropdown on dashboard)
      let matchesRisk = true;
      if (riskFilter !== 'ALL') {
        if (!highestRiskEntry) {
            // If no valid risk remains after global settings, consider it LOW for filtering purposes
            matchesRisk = riskFilter === 'LOW'; 
        } else {
            matchesRisk = highestRiskEntry[1].risk_level === riskFilter;
        }
      }

      return matchesSearch && matchesRisk;
    }).sort((a, b) => (a.composite_health_score || 0) - (b.composite_health_score || 0)); // Sort by Health Score (Ascending - Worst first)
  }, [patients, searchTerm, riskFilter, settings]);

  // --- Stats Calculation ---
  const stats: DashboardStats = useMemo(() => {
    if (!patients.length) return { totalPatients: 0, activeAlerts: 0, highRiskPatients: 0, averageHealthScore: 0 };
    
    const totalPatients = patients.length;
    
    // Recalculate stats based on enabled risks/thresholds
    const activeAlerts = patients.filter(p => {
        const risk = getRelevantHighestRisk(p);
        return risk && (risk[1].risk_level === 'MEDIUM' || risk[1].risk_level === 'HIGH');
    }).length;

    const highRiskPatients = patients.filter(p => {
        const risk = getRelevantHighestRisk(p);
        return risk && risk[1].risk_level === 'HIGH';
    }).length;

    const avgScore = Math.round(patients.reduce((acc, curr) => acc + (curr.composite_health_score || 0), 0) / totalPatients);

    return { totalPatients, activeAlerts, highRiskPatients, averageHealthScore: avgScore };
  }, [patients, settings]);

  // --- Active Alerts Logic (Enhanced with Filtering) ---
  const activeAlerts = useMemo(() => {
    return patients
      .filter(p => {
        // Filter 1: Must have risk and not be dismissed
        const risk = getRelevantHighestRisk(p);
        const hasRisk = risk && (risk[1].risk_level === 'HIGH' || risk[1].risk_level === 'MEDIUM');
        if (!hasRisk || dismissedAlerts.has(p.prediction_id)) return false;
        
        // Filter 2: Health score threshold
        const score = p.composite_health_score || 0;
        if (score > alertScoreThreshold) return false;
        
        // Filter 3: Specific risk type filter
        if (alertRiskTypeFilter !== 'ALL') {
          return risk && risk[0] === alertRiskTypeFilter;
        }
        
        return true;
      })
      .sort((a, b) => {
          // PRIMARY SORT: Health Score (ascending - worst first)
          const scoreA = a.composite_health_score || 0;
          const scoreB = b.composite_health_score || 0;
          
          if (scoreA !== scoreB) {
            return scoreA - scoreB; // Lower scores first (more critical)
          }
          
          // SECONDARY SORT: Risk Level (HIGH > MEDIUM > LOW)
          const aRisk = getRelevantHighestRisk(a);
          const bRisk = getRelevantHighestRisk(b);
          
          const riskLevelValue = (level: string) => {
            if (level === 'HIGH') return 3;
            if (level === 'MEDIUM') return 2;
            if (level === 'LOW') return 1;
            return 0;
          };
          
          const aLevel = aRisk ? riskLevelValue(aRisk[1].risk_level) : 0;
          const bLevel = bRisk ? riskLevelValue(bRisk[1].risk_level) : 0;
          
          if (aLevel !== bLevel) {
            return bLevel - aLevel; // Higher risk level first
          }
          
          // TERTIARY SORT: Risk Probability
          const aProb = aRisk ? aRisk[1].probability : 0;
          const bProb = bRisk ? bRisk[1].probability : 0;
          return bProb - aProb; // Higher probability first
      });
  }, [patients, dismissedAlerts, settings, alertRiskTypeFilter, alertScoreThreshold]);

  // Calculate additional metrics (must be before early return)
  const avgGlucose = useMemo(() => {
    if (!patients.length) return 0;
    return Math.round(patients.reduce((acc, p) => acc + p.vitals.glucose_mgdl, 0) / patients.length);
  }, [patients]);

  const patientsWithActivity = useMemo(() => {
    return patients.filter(p => p.vitals.steps_per_minute > 0).length;
  }, [patients]);

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlerts(prev => new Set(prev).add(id));
  };

  if (loading && patients.length === 0) {
      return (
          <div className="flex h-96 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats Row - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard title="Total Patients" value={stats.totalPatients} icon={Users} color="blue" subtitle="Active Monitoring" />
        <SummaryCard title="Critical Status" value={stats.highRiskPatients} icon={Activity} color="red" subtitle="High Risk" />
        <SummaryCard title="Avg Health Score" value={stats.averageHealthScore} icon={Heart} color={stats.averageHealthScore > 75 ? 'green' : 'orange'} subtitle={`Target: >80`} />
        <SummaryCard title="Avg Glucose" value={`${avgGlucose}`} icon={Droplets} color="teal" subtitle="mg/dL" />
        <SummaryCard title="Active Patients" value={patientsWithActivity} icon={TrendingUp} color="purple" subtitle="Currently Moving" />
      </div>

      {/* New: Insights Row - Population Level Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlucoseDistribution patients={patients} />
        <RiskMatrix patients={patients} settings={settings} />
        <VitalsOverview patients={patients} />
        <RiskDistributionPieChart patients={patients} settings={settings} getRelevantHighestRisk={getRelevantHighestRisk} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* LEFT COLUMN: Main Patient List (3/4 width) */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search patient ID..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="text-slate-400 w-4 h-4" />
              <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Patient ID</th>
                    <th className="px-6 py-4 w-56">Health Score</th>
                    <th className="px-6 py-4">Highest Risk</th>
                    <th className="px-6 py-4">Key Vitals</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            No patients found matching criteria.
                        </td>
                    </tr>
                  ) : filteredPatients.map((patient) => {
                    const highestRiskEntry = getRelevantHighestRisk(patient);
                    
                    const score = patient.composite_health_score || 0;
                    
                    // Score Color Logic
                    let scoreColor = 'bg-red-500';
                    let scoreTextColor = 'text-red-700';
                    if (score > 40) { scoreColor = 'bg-orange-500'; scoreTextColor = 'text-orange-700'; }
                    if (score > 60) { scoreColor = 'bg-yellow-500'; scoreTextColor = 'text-yellow-700'; }
                    if (score > 80) { scoreColor = 'bg-green-500'; scoreTextColor = 'text-green-700'; }

                    return (
                      <tr 
                        key={patient.patient_id} 
                        onClick={() => navigate(`/patient/${patient.patient_id}`)}
                        className="group hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                      >
                        <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800">{patient.patient_id}</span>
                            <span className="block text-[10px] text-slate-400">Updated: {new Date(patient.timestamp).toLocaleTimeString()}</span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                                <span className={`text-xl font-black w-10 text-right ${scoreTextColor}`}>{score}</span>
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${scoreColor} transition-all duration-500`} 
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            {highestRiskEntry ? (
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">{highestRiskEntry[0]}</span>
                                    <RiskBadge level={highestRiskEntry[1].risk_level} />
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 italic">No significant risk</span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex space-x-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block">HR</span>
                                    <span className="font-medium text-slate-700">{patient.vitals.heart_rate_bpm.toFixed(0)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">SpO2</span>
                                    <span className="font-medium text-slate-700">{patient.vitals.spo2_pct.toFixed(0)}%</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Glu</span>
                                    <span className="font-medium text-slate-700">{patient.vitals.glucose_mgdl.toFixed(0)}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                             <ArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Critical Alerts Feed (1/4 width) */}
        <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)] sticky top-6">
                {/* Alert Feed Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <Bell className="w-4 h-4 mr-2 text-slate-500" />
                            Alert Feed
                            {activeAlerts.length > 0 && (
                                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {activeAlerts.length}
                                </span>
                            )}
                        </h3>
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Filter className="w-3 h-3 text-slate-400" />
                            <select 
                                className="flex-1 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5"
                                value={alertRiskTypeFilter}
                                onChange={(e) => setAlertRiskTypeFilter(e.target.value as any)}
                            >
                                <option value="ALL">All Risk Types</option>
                                <option value="cardiac">🫀 Cardiac</option>
                                <option value="hypoglycemia">🩸 Hypoglycemia</option>
                                <option value="fall">🤕 Fall Risk</option>
                                <option value="hypotension">💉 Hypotension</option>
                                <option value="autonomic">🧠 Autonomic</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-slate-400" />
                            <div className="flex-1">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={alertScoreThreshold}
                                    onChange={(e) => setAlertScoreThreshold(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                    <span>Score ≤ {alertScoreThreshold}</span>
                                    <span className={alertScoreThreshold < 50 ? 'text-red-600 font-bold' : ''}>
                                        {alertScoreThreshold < 50 ? 'Critical' : alertScoreThreshold < 70 ? 'Moderate' : 'All'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Clear Filters Button */}
                        {(alertRiskTypeFilter !== 'ALL' || alertScoreThreshold !== 100) && (
                            <button
                                onClick={() => {
                                    setAlertRiskTypeFilter('ALL');
                                    setAlertScoreThreshold(100);
                                }}
                                className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1 hover:bg-blue-50 rounded transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Alert List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {activeAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                             <div className="bg-green-50 p-4 rounded-full mb-3">
                                <Activity className="w-8 h-8 text-green-500" />
                             </div>
                             <p className="text-slate-800 font-medium">All Clear</p>
                             <p className="text-sm text-slate-500">No active alerts matching criteria.</p>
                        </div>
                    ) : (
                        activeAlerts.map(alert => {
                             const highRisk = getRelevantHighestRisk(alert);
                             
                             if (!highRisk) return null;

                             const isCritical = highRisk[1].risk_level === 'HIGH';

                             // Determine severity color based on health score
                             const healthScore = alert.composite_health_score || 0;
                             let scoreColor = 'text-red-700';
                             let scoreBgColor = 'bg-red-100';
                             let cardBgColor = 'bg-red-50 border-red-200';
                             
                             if (healthScore >= 70) {
                               scoreColor = 'text-orange-700';
                               scoreBgColor = 'bg-orange-100';
                               cardBgColor = 'bg-orange-50 border-orange-200';
                             } else if (healthScore >= 50) {
                               scoreColor = 'text-red-600';
                               scoreBgColor = 'bg-red-100';
                               cardBgColor = 'bg-red-50 border-red-200';
                             } else {
                               scoreColor = 'text-red-800';
                               scoreBgColor = 'bg-red-200';
                               cardBgColor = 'bg-red-100 border-red-300';
                             }

                             return (
                                <div 
                                    key={alert.prediction_id}
                                    onClick={() => navigate(`/patient/${alert.patient_id}`)}
                                    className={`
                                        group relative p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md
                                        ${cardBgColor}
                                    `}
                                >
                                    <button 
                                        onClick={(e) => dismissAlert(alert.prediction_id, e)}
                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Dismiss alert"
                                    >
                                        <X size={14} />
                                    </button>

                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-800 text-sm block">{alert.patient_id}</span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        {/* Prominent Health Score Badge */}
                                        <div className={`${scoreBgColor} ${scoreColor} px-2 py-1 rounded-lg font-black text-lg ml-2`}>
                                            {healthScore}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 mb-2">
                                        <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-red-500' : 'text-orange-500'}`} />
                                        <span className={`text-xs font-bold uppercase ${isCritical ? 'text-red-700' : 'text-orange-700'}`}>
                                            {highRisk[0]} Risk
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {(highRisk[1].probability * 100).toFixed(0)}%
                                        </span>
                                    </div>

                                    <div className="w-full bg-white/50 rounded-full h-1.5 mb-1">
                                        <div 
                                            className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-orange-500'}`} 
                                            style={{ width: `${highRisk[1].probability * 100}%` }}
                                        />
                                    </div>
                                    
                                    {/* Quick vitals preview */}
                                    <div className="flex justify-between text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                        <span>Glu: {alert.vitals.glucose_mgdl.toFixed(0)}</span>
                                        <span>HR: {alert.vitals.heart_rate_bpm.toFixed(0)}</span>
                                        <span>SpO2: {alert.vitals.spo2_pct.toFixed(0)}%</span>
                                    </div>
                                </div>
                             )
                        })
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;