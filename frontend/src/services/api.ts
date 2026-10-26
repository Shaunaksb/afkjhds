import axios from 'axios';
import {
  HealthResponse,
  DayAheadForecastResponse,
  MonthlyMetricsResponse,
  ProcurementSimulationResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const api = {
  getHealth: async (): Promise<HealthResponse> => {
    const res = await client.get<HealthResponse>('/health');
    return res.data;
  },

  getDates: async (): Promise<string[]> => {
    const res = await client.get<{ dates: string[] }>('/dates');
    return res.data.dates;
  },

  getDayAheadForecast: async (date: string, cutoff: string): Promise<DayAheadForecastResponse> => {
    const res = await client.get<DayAheadForecastResponse>('/forecast/day-ahead', {
      params: { date, cutoff },
    });
    return res.data;
  },

  getMonthlyMetrics: async (month: string = '2026-01', cutoff: string = '11:00'): Promise<MonthlyMetricsResponse> => {
    const res = await client.get<MonthlyMetricsResponse>('/metrics/monthly', {
      params: { month, cutoff },
    });
    return res.data;
  },

  simulateProcurement: async (payload: {
    date: string;
    cutoff: string;
    baseDemandMW: number;
    demandProfile: string;
    confidenceLevel: number;
  }): Promise<ProcurementSimulationResponse> => {
    const res = await client.post<ProcurementSimulationResponse>('/procurement/simulate', payload);
    return res.data;
  },

  triggerSync: async (days: number = 31): Promise<{ status: string; message: string }> => {
    const res = await client.post('/sync', null, { params: { days } });
    return res.data;
  },
};
