import { ApiResponse, PatientRecord, Vitals, Predictions, PredictionDetail } from '../types';

const BASE_URL = 'https://healthcare-predictor-386846984946.us-central1.run.app';
const FETCH_TIMEOUT = 30000; // 30 seconds timeout to handle Cloud Run cold starts

/**
 * Comprehensive Health Score Calculator
 * 
 * Calculates a personalized 0-100 health score based on multiple factors:
 * - Glucose Control (25pts): CGM data, time in range
 * - Cardiac Health (20pts): Heart rate, HRV
 * - Oxygenation (15pts): SpO2 levels
 * - Activity Level (10pts): Physical activity, movement
 * - Temperature (5pts): Body temperature normality
 * - Respiratory (5pts): Breathing rate
 * - AI Risk Predictions (20pts): Combined risk models
 * 
 * Higher score = Better health status
 */
export const calculateHealthScore = (record: PatientRecord): number => {
  const v = record.vitals;
  const p = record.predictions;

  if (!p || !v) return 0;

  let score = 0;

  // 1. GLUCOSE CONTROL (25 points) - Critical for CGM monitoring
  let glucoseScore = 0;
  const glucose = v.glucose_mgdl;
  
  if (glucose >= 80 && glucose <= 180) {
    // Perfect range - full points
    glucoseScore = 25;
  } else if (glucose >= 70 && glucose < 80) {
    // Slightly low - good but not perfect
    glucoseScore = 20;
  } else if (glucose > 180 && glucose <= 200) {
    // Slightly high
    glucoseScore = 18;
  } else if (glucose >= 60 && glucose < 70) {
    // Low - concerning
    glucoseScore = 12;
  } else if (glucose > 200 && glucose <= 250) {
    // High - concerning
    glucoseScore = 12;
  } else if (glucose >= 54 && glucose < 60) {
    // Very low - dangerous
    glucoseScore = 5;
  } else if (glucose > 250 && glucose <= 300) {
    // Very high - dangerous
    glucoseScore = 5;
  } else {
    // Critical levels
    glucoseScore = 0;
  }
  
  // Adjust for insulin on board and carbs (shows management)
  if (v.insulin_on_board > 0 && glucose < 100) {
    glucoseScore = Math.max(0, glucoseScore - 3); // Risk of going lower
  }
  if (v.carbs_in_stomach > 10 && glucose > 150) {
    glucoseScore = Math.max(0, glucoseScore - 2); // May go higher
  }
  
  score += glucoseScore;

  // 2. CARDIAC HEALTH (20 points)
  let cardiacScore = 0;
  const hr = v.heart_rate_bpm;
  const hrv = v.hrv_sdnn;
  
  // Heart Rate scoring (0-12 points)
  if (hr >= 60 && hr <= 100) {
    cardiacScore += 12; // Normal range
  } else if (hr >= 50 && hr < 60) {
    cardiacScore += 9; // Bradycardia (mild)
  } else if (hr > 100 && hr <= 110) {
    cardiacScore += 9; // Mild tachycardia
  } else if (hr >= 40 && hr < 50) {
    cardiacScore += 5; // Concerning bradycardia
  } else if (hr > 110 && hr <= 130) {
    cardiacScore += 5; // Concerning tachycardia
  } else {
    cardiacScore += 0; // Critical heart rate
  }
  
  // Heart Rate Variability scoring (0-8 points) - Higher HRV = Better
  if (hrv >= 50) {
    cardiacScore += 8; // Excellent autonomic function
  } else if (hrv >= 40) {
    cardiacScore += 7; // Good
  } else if (hrv >= 30) {
    cardiacScore += 5; // Fair
  } else if (hrv >= 20) {
    cardiacScore += 3; // Poor
  } else {
    cardiacScore += 1; // Very poor autonomic function
  }
  
  score += cardiacScore;

  // 3. OXYGENATION (15 points)
  let oxygenScore = 0;
  const spo2 = v.spo2_pct;
  
  if (spo2 >= 97) {
    oxygenScore = 15; // Excellent
  } else if (spo2 >= 95) {
    oxygenScore = 13; // Good
  } else if (spo2 >= 92) {
    oxygenScore = 9; // Mild hypoxemia
  } else if (spo2 >= 90) {
    oxygenScore = 5; // Moderate hypoxemia
  } else if (spo2 >= 85) {
    oxygenScore = 2; // Severe hypoxemia
  } else {
    oxygenScore = 0; // Critical
  }
  
  score += oxygenScore;

  // 4. ACTIVITY LEVEL (10 points)
  let activityScore = 0;
  const steps = v.steps_per_minute;
  const intensity = v.activity_intensity;
  
  // Steps scoring (0-6 points)
  if (steps >= 20) {
    activityScore += 6; // Very active
  } else if (steps >= 10) {
    activityScore += 5; // Active
  } else if (steps >= 5) {
    activityScore += 4; // Moderately active
  } else if (steps >= 2) {
    activityScore += 2; // Light activity
  } else if (steps > 0) {
    activityScore += 1; // Minimal activity
  }
  // 0 steps = 0 points (sedentary, concerning for long-term)
  
  // Activity intensity (0-4 points)
  if (intensity >= 0.7) {
    activityScore += 4; // High intensity
  } else if (intensity >= 0.4) {
    activityScore += 3; // Moderate
  } else if (intensity >= 0.2) {
    activityScore += 2; // Light
  } else if (intensity > 0) {
    activityScore += 1; // Minimal
  }
  
  score += activityScore;

  // 5. TEMPERATURE (5 points)
  let tempScore = 0;
  const temp = v.skin_temperature_c;
  
  if (temp >= 36.5 && temp <= 37.2) {
    tempScore = 5; // Normal
  } else if (temp >= 36.0 && temp < 36.5) {
    tempScore = 4; // Slightly cool
  } else if (temp > 37.2 && temp <= 37.8) {
    tempScore = 3; // Slightly warm
  } else if (temp >= 35.5 && temp < 36.0) {
    tempScore = 2; // Cool
  } else if (temp > 37.8 && temp <= 38.5) {
    tempScore = 2; // Warm/fever
  } else {
    tempScore = 0; // Hypothermia or high fever
  }
  
  score += tempScore;

  // 6. RESPIRATORY HEALTH (5 points)
  let respiratoryScore = 0;
  const respRate = v.respiratory_rate_rpm;
  
  if (respRate >= 12 && respRate <= 20) {
    respiratoryScore = 5; // Normal
  } else if (respRate >= 10 && respRate < 12) {
    respiratoryScore = 4; // Slightly slow
  } else if (respRate > 20 && respRate <= 24) {
    respiratoryScore = 3; // Slightly fast (tachypnea)
  } else if (respRate >= 8 && respRate < 10) {
    respiratoryScore = 2; // Bradypnea
  } else if (respRate > 24 && respRate <= 30) {
    respiratoryScore = 2; // Tachypnea
  } else {
    respiratoryScore = 0; // Critical
  }
  
  score += respiratoryScore;

  // 7. AI RISK PREDICTIONS (20 points)
  // Higher risk = Lower score
  let riskScore = 20;
  
  // Weight each risk by clinical severity
  const hypoglycemiaRisk = p.hypoglycemia.probability * 5; // Critical
  const cardiacRisk = p.cardiac.probability * 6; // Most critical
  const fallRisk = p.fall.probability * 3; // Serious
  const hypotensionRisk = p.hypotension.probability * 4; // Serious
  const autonomicRisk = p.autonomic.probability * 2; // Important
  
  const totalRiskDeduction = hypoglycemiaRisk + cardiacRisk + fallRisk + hypotensionRisk + autonomicRisk;
  riskScore = Math.max(0, riskScore - totalRiskDeduction);
  
  score += riskScore;

  // FINAL ADJUSTMENTS
  // Bonus for excellent multiple metrics
  if (glucoseScore >= 23 && cardiacScore >= 18 && oxygenScore >= 14) {
    score = Math.min(100, score + 2); // Excellent overall health bonus
  }
  
  // Penalty for multiple concerning metrics
  let concerningMetrics = 0;
  if (glucoseScore <= 12) concerningMetrics++;
  if (cardiacScore <= 10) concerningMetrics++;
  if (oxygenScore <= 9) concerningMetrics++;
  if (activityScore <= 2) concerningMetrics++;
  
  if (concerningMetrics >= 3) {
    score = Math.max(0, score - 3); // Multiple system concerns
  }

  return Math.round(Math.max(0, Math.min(100, score)));
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