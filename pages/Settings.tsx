import React from 'react';
import { AppSettings } from '../types';
import { Shield, Activity, Save } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  
  const toggleRisk = (key: keyof AppSettings['enabledRisks']) => {
    onSettingsChange({
      ...settings,
      enabledRisks: {
        ...settings.enabledRisks,
        [key]: !settings.enabledRisks[key]
      }
    });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      minProbabilityThreshold: parseInt(e.target.value)
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Settings</h1>
        <p className="text-slate-500 mt-1">Configure global filters and risk monitoring preferences.</p>
      </div>

      {/* Risk Visibility Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
             <Shield size={20} />
           </div>
           <div>
             <h2 className="font-bold text-slate-800">Active Risk Models</h2>
             <p className="text-sm text-slate-500">Select which AI prediction models to display on the dashboard.</p>
           </div>
        </div>
        <div className="p-6 grid gap-4">
          {Object.entries(settings.enabledRisks).map(([key, enabled]) => (
            <label key={key} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="font-medium text-slate-700 capitalize group-hover:text-slate-900">{key} Risk</span>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                <input 
                  type="checkbox" 
                  className="peer absolute w-0 h-0 opacity-0"
                  checked={enabled}
                  onChange={() => toggleRisk(key as keyof AppSettings['enabledRisks'])}
                />
                <span className={`block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Probability Threshold Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3">
           <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
             <Activity size={20} />
           </div>
           <div>
             <h2 className="font-bold text-slate-800">Sensitivity Threshold</h2>
             <p className="text-sm text-slate-500">Filter out low-probability risks to reduce noise.</p>
           </div>
        </div>
        <div className="p-8">
            <div className="mb-6">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Minimum Probability</span>
                    <span className="text-sm font-bold text-blue-600">{settings.minProbabilityThreshold}%</span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="90" 
                    step="5"
                    value={settings.minProbabilityThreshold}
                    onChange={handleThresholdChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>0% (Show All)</span>
                    <span>90% (Critical Only)</span>
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p>Risks with a calculated probability below <strong>{settings.minProbabilityThreshold}%</strong> will be excluded from the "Highest Risk" column and Alert Feed on the dashboard.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;