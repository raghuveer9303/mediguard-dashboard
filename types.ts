export interface Vitals {
  glucose_mgdl: number;
  heart_rate_bpm: number;
  hrv_sdnn: number;
  qt_interval_ms: number;
  respiratory_rate_rpm: number;
  spo2_pct: number;
  steps_per_minute: number;
  vertical_acceleration_g: number;
  skin_temperature_c: number;
  eda_microsiemens: number;
  insulin_on_board: number;
  carbs_in_stomach: number;
  activity_intensity: number;
}

export interface PredictionDetail {
  risk: number; // 0 or 1
  probability: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Predictions {
  hypoglycemia: PredictionDetail;
  fall: PredictionDetail;
  cardiac: PredictionDetail;
  hypotension: PredictionDetail;
  autonomic: PredictionDetail;
}

export interface PatientRecord {
  prediction_id: string;
  patient_id: string;
  timestamp: string;
  inserted_at: string;
  vitals: Vitals;
  predictions: Predictions;
  metadata: {
    models_used: number;
    num_features: number;
  };
  // Calculated on frontend
  composite_health_score?: number;
}

export interface ApiResponse {
  status: string;
  count: number;
  data: PatientRecord[];
}

export interface DashboardStats {
  totalPatients: number;
  activeAlerts: number;
  highRiskPatients: number;
  averageHealthScore: number;
}

export interface AppSettings {
  // Which risk models are active/visible in the dashboard
  enabledRisks: {
    hypoglycemia: boolean;
    fall: boolean;
    cardiac: boolean;
    hypotension: boolean;
    autonomic: boolean;
  };
  // Minimum probability (0-100) to consider a risk relevant enough to show/alert
  minProbabilityThreshold: number;
}