export interface SettlementPeriodRecord {
  settlementDate: string;
  settlementPeriod: number;
  startTime: string;
  actualGeneration: number | null;
  forecastGeneration: number | null;
  forecastPublishTime: string | null;
  errorDelta: number | null; // Positive = Over-forecast (Deficit risk); Negative = Under-forecast (Surplus)
}

export interface PeakPeriodMetric {
  count: number;
  mae: number;
  bias: number;
}

export interface AccuracyMetrics {
  sampleCount: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  mape: number;
  maxOverForecast: number;
  maxUnderForecast: number;
  overForecastCount: number;
  underForecastCount: number;
  riskLevel: 'HIGH_DEFICIT_RISK' | 'SURPLUS_RISK' | 'BALANCED' | 'UNKNOWN';
  riskLabel: string;
  percentiles: {
    p10: number;
    p50: number;
    p90: number;
  };
  peakAnalysis: {
    morningPeak: PeakPeriodMetric;
    eveningPeak: PeakPeriodMetric;
    offPeak: PeakPeriodMetric;
  };
}

export interface DayAheadForecastResponse {
  deliveryDate: string;
  marketCutoffTime: string;
  cutoffISO: string;
  settlementPeriods: SettlementPeriodRecord[];
  metrics: AccuracyMetrics;
}

export interface DailySummaryItem {
  date: string;
  sampleCount: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  riskLevel: string;
}

export interface MonthlyMetricsResponse {
  month: string;
  cutoffTime: string;
  daysCount: number;
  totalSettlementPeriods: number;
  summary: AccuracyMetrics;
  dailyBreakdown: DailySummaryItem[];
}

export interface ProcurementScheduleItem {
  settlementPeriod: number;
  startTime: string;
  demandMW: number;
  windForecastMW: number;
  actualWindMW: number;
  baseThermalOrderMW: number;
  recommendedBufferedOrderMW: number;
  imbalanceDeficitMW: number;
}

export interface ProcurementSimulationResponse {
  deliveryDate: string;
  marketCutoffTime: string;
  cutoffISO: string;
  simulation: {
    baseDemandMW: number;
    demandProfile: string;
    safetyBufferMW: number;
    confidenceLevelPct: number;
    totalDemandMWh: number;
    totalWindForecastMWh: number;
    totalActualWindMWh: number;
    totalThermalProcuredMWh: number;
    totalUncoveredDeficitMWh: number;
    schedule: ProcurementScheduleItem[];
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  market: string;
  database: {
    actualCount: number;
    forecastCount: number;
    isSeeded: boolean;
  };
  availableDatesCount: number;
  minDate: string | null;
  maxDate: string | null;
}
