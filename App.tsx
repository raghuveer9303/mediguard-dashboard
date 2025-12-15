import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { fetchDashboardData, fetchSystemHealth, getLatestPatientStates } from './services/api';
import { PatientRecord, AppSettings } from './types';

const App: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [systemHealthy, setSystemHealthy] = useState<boolean>(true);

  // Global Settings State
  const [settings, setSettings] = useState<AppSettings>({
    enabledRisks: {
      hypoglycemia: true,
      fall: true,
      cardiac: true,
      hypotension: true,
      autonomic: true
    },
    minProbabilityThreshold: 0
  });

  const fetchData = async () => {
    try {
      const [health, rawData] = await Promise.all([
        fetchSystemHealth(),
        fetchDashboardData(1000)
      ]);
      
      // If health check passes OR we successfully got data (status 200 basically), system is healthy
      // rawData check ensures if the explicit health endpoint fails but data works, we still show green.
      setSystemHealthy(health || (rawData && rawData.length > 0));
      
      // Process raw data to get unique patients (latest state)
      const uniquePatients = getLatestPatientStates(rawData);
      setPatients(uniquePatients);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Global fetch error", error);
      setSystemHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Poll every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <HashRouter>
      <Layout systemHealthy={systemHealthy}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                patients={patients} 
                lastUpdated={lastUpdated} 
                loading={loading} 
                settings={settings}
              />
            } 
          />
          <Route path="/patient/:patientId" element={<PatientDetail />} />
          <Route path="/analytics" element={<Analytics patients={patients} />} />
          <Route path="/settings" element={<Settings settings={settings} onSettingsChange={setSettings} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;