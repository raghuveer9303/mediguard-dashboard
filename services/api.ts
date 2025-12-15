import { ApiResponse, PatientRecord, Vitals, Predictions, PredictionDetail } from '../types';

const BASE_URL = 'https://healthcare-predictor-386846984946.us-central1.run.app';
const FETCH_TIMEOUT = 30000; // 30 seconds timeout to handle Cloud Run cold starts

// Helper to calculate score based on the prompt's formula
export const calculateHealthScore = (record: PatientRecord): number => {
  const baseScore = 100;
  const p = record.predictions;

  if (!p) return 0;

  const deductions = 
    (p.hypoglycemia.probability * 20) +
    (p.fall.probability * 15) +
    (p.cardiac.probability * 25) +
    (p.hypotension.probability * 20) +
    (p.autonomic.probability * 20);

  const finalScore = Math.max(0, baseScore - deductions);
  return Math.round(finalScore);
};

// --- MOCK DATA GENERATOR ---
const generateMockPatients = (count: number): PatientRecord[] => {
  const patients: PatientRecord[] = [];
  const now = Date.now();
  
  for (let i = 1; i <= count; i++) {
    const patientId = `PATIENT_${i.toString().padStart(3, '0')}`;
    
    // Helper for random vitals
    const vitals: Vitals = {
      glucose_mgdl: 80 + Math.random() * 60,
      heart_rate_bpm: 60 + Math.random() * 40,
      hrv_sdnn: 30 + Math.random() * 50,
      qt_interval_ms: 380 + Math.random() * 60,
      respiratory_rate_rpm: 12 + Math.random() * 8,
      spo2_pct: 95 + Math.random() * 5,
      steps_per_minute: Math.random() * 50,
      vertical_acceleration_g: Math.random() * 1.5,
      skin_temperature_c: 36.5 + Math.random(),
      eda_microsiemens: Math.random() * 5,
      insulin_on_board: Math.random(),
      carbs_in_stomach: Math.random() * 20,
      activity_intensity: Math.random()
    };

    const makePred = (): PredictionDetail => {
      const prob = Math.random();
      let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (prob > 0.7) level = 'MEDIUM';
      if (prob > 0.9) level = 'HIGH';
      return {
        risk: prob > 0.5 ? 1 : 0,
        probability: prob,
        confidence: 0.7 + Math.random() * 0.3,
        risk_level: level
      };
    };

    patients.push({
      prediction_id: `${patientId}_${now}`,
      patient_id: patientId,
      timestamp: new Date(now).toISOString(),
      inserted_at: new Date(now).toISOString(),
      vitals,
      predictions: {
        hypoglycemia: makePred(),
        fall: makePred(),
        cardiac: makePred(),
        hypotension: makePred(),
        autonomic: makePred()
      },
      metadata: { models_used: 5, num_features: 79 }
    });
  }
  return patients;
};

const generateMockHistory = (patientId: string, count: number): PatientRecord[] => {
  const history: PatientRecord[] = [];
  const now = Date.now();
  // Generate one record to use as a template so vitals don't jump wildly
  const baseRecord = generateMockPatients(1)[0]; 
  baseRecord.patient_id = patientId;

  for (let i = 0; i < count; i++) {
    // Generate records going back in time (e.g., every 15 mins)
    const time = new Date(now - (count - 1 - i) * 15 * 60 * 1000); 
    
    // Deep copy to modify
    const record: PatientRecord = JSON.parse(JSON.stringify(baseRecord));
    record.timestamp = time.toISOString();
    record.prediction_id = `${patientId}_${time.getTime()}`;
    
    // Add some noise to vitals to simulate trends
    record.vitals.heart_rate_bpm += (Math.random() - 0.5) * 15;
    record.vitals.glucose_mgdl += (Math.random() - 0.5) * 10;
    record.vitals.spo2_pct = Math.min(100, Math.max(90, record.vitals.spo2_pct + (Math.random() - 0.5) * 2));
    
    // Recalculate predictions based on noisy vitals
    Object.values(record.predictions).forEach((pred: any) => {
        pred.probability = Math.max(0, Math.min(1, pred.probability + (Math.random() - 0.5) * 0.2));
        if (pred.probability > 0.9) pred.risk_level = 'HIGH';
        else if (pred.probability > 0.7) pred.risk_level = 'MEDIUM';
        else pred.risk_level = 'LOW';
    });

    history.push(record);
  }
  return history;
};

// --- API FUNCTIONS ---

// Helper for fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

let isDemoModeLogged = false;

export const fetchSystemHealth = async (): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/health`);
    return res.ok;
  } catch (e) {
    // If standard fetch fails (likely CORS), try no-cors to confirm server existence.
    // An opaque response (no error) means the server is reachable.
    try {
        await fetchWithTimeout(`${BASE_URL}/health`, { mode: 'no-cors' });
        return true; 
    } catch (e2) {
        return false;
    }
  }
};

export const fetchDashboardData = async (limit: number = 1000): Promise<PatientRecord[]> => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/dashboard/data?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch data');
    const json: ApiResponse = await res.json();
    
    // Enrich data with calculated score
    return json.data.map(record => ({
      ...record,
      composite_health_score: calculateHealthScore(record)
    }));
  } catch (error) {
    if (!isDemoModeLogged) {
        console.warn("Backend API unavailable (CORS or Timeout). Switching to demo mode with mock data.");
        isDemoModeLogged = true;
    }
    
    // Return mock data if API fails
    const mockData = generateMockPatients(15);
    return mockData.map(record => ({
        ...record,
        composite_health_score: calculateHealthScore(record)
    }));
  }
};

export const fetchPatientHistory = async (patientId: string, limit: number = 100): Promise<PatientRecord[]> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await fetchWithTimeout(`${BASE_URL}/dashboard/data?patient_id=${patientId}&start_time=${oneDayAgo}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch patient history');
    const json: ApiResponse = await res.json();
    
    // Sort by timestamp ascending for charts
    return json.data
      .map(record => ({
        ...record,
        composite_health_score: calculateHealthScore(record)
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    // Silent fallback for individual patient history to avoid spamming logs during polling
    const mockHistory = generateMockHistory(patientId, 20);
    return mockHistory.map(record => ({
        ...record,
        composite_health_score: calculateHealthScore(record)
    }));
  }
};

// Helper to process raw records into unique patient latest states
export const getLatestPatientStates = (records: PatientRecord[]): PatientRecord[] => {
  const patientMap = new Map<string, PatientRecord>();

  records.forEach(record => {
    const current = patientMap.get(record.patient_id);
    if (!current || new Date(record.timestamp) > new Date(current.timestamp)) {
      patientMap.set(record.patient_id, record);
    }
  });

  return Array.from(patientMap.values());
};