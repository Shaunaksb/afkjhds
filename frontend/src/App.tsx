import { useState, useEffect } from 'react';
import { api } from './services/api';
import { DayAheadForecastResponse, HealthResponse } from './types';
import { Navbar } from './components/Navbar';
import { DateCutoffBar } from './components/DateCutoffBar';
import { WindHorizonChart } from './components/WindHorizonChart';
import { QuantScorecard } from './components/QuantScorecard';
import { PeakHourAnalysis } from './components/PeakHourAnalysis';
import { ProcurementSimulator } from './components/ProcurementSimulator';
import { MonthlySummaryModal } from './components/MonthlySummaryModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('11:00');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [forecastData, setForecastData] = useState<DayAheadForecastResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState<boolean>(false);

  // Initial boot: load health & dates
  useEffect(() => {
    const initApp = async () => {
      try {
        const [h, dates] = await Promise.all([api.getHealth(), api.getDates()]);
        setHealth(h);
        setAvailableDates(dates);
        if (dates.length > 0 && !dates.includes(selectedDate)) {
          setSelectedDate(dates[0]);
        }
      } catch (err: any) {
        console.error('Failed to initialize app metadata:', err);
        setError('Failed to connect to Gridbricks backend API. Ensure the backend is running.');
      }
    };
    initApp();
  }, []);

  // Fetch forecast data whenever selectedDate or cutoffTime changes
  useEffect(() => {
    let isCurrent = true;
    const fetchForecast = async () => {
      if (!selectedDate) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getDayAheadForecast(selectedDate, cutoffTime);
        if (isCurrent) {
          setForecastData(data);
        }
      } catch (err: any) {
        if (isCurrent) {
          console.error('Failed to load forecast data:', err);
          setError(err.response?.data?.detail || 'Failed to load forecast data for selected parameters.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchForecast();
    return () => {
      isCurrent = false;
    };
  }, [selectedDate, cutoffTime]);

  return (
    <div className="min-h-screen bg-trading-bg text-slate-100 flex flex-col">
      <Navbar
        health={health}
        onOpenMonthlyModal={() => setMonthlyModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Controls Bar */}
        <DateCutoffBar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          availableDates={availableDates}
          cutoffTime={cutoffTime}
          onSelectCutoffTime={setCutoffTime}
          cutoffISO={forecastData?.cutoffISO || ''}
        />

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold">Data Ingestion Notice</p>
              <p className="text-xs text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && !forecastData && (
          <div className="py-24 text-center space-y-3 font-mono animate-pulse">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <div className="text-sm text-slate-300">
              Querying point-in-time Elexon stream datasets for {selectedDate} @ {cutoffTime} GMT...
            </div>
            <div className="text-xs text-slate-500">
              Enforcing zero-lookahead filter: publishTime &le; D-1 Cutoff
            </div>
          </div>
        )}

        {forecastData && (
          <div className="space-y-6">
            {/* Primary Time-Series Horizon Chart */}
            <WindHorizonChart
              data={forecastData.settlementPeriods}
              deliveryDate={forecastData.deliveryDate}
              marketCutoffTime={forecastData.marketCutoffTime}
            />

            {/* Quantitative Accuracy Scorecard */}
            <QuantScorecard metrics={forecastData.metrics} />

            {/* Peak Hour Stress Analysis */}
            <PeakHourAnalysis peakAnalysis={forecastData.metrics.peakAnalysis} />

            {/* Thermal Procurement Simulator */}
            <ProcurementSimulator
              selectedDate={selectedDate}
              cutoffTime={cutoffTime}
            />
          </div>
        )}
      </main>

      {/* Monthly Audit Modal */}
      <MonthlySummaryModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        cutoffTime={cutoffTime}
        onSelectDate={setSelectedDate}
      />

      {/* Footer */}
      <footer className="border-t border-trading-border py-4 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Gridbricks Energy Utility Trading Platform · January 2026</span>
          <span>Elexon BMRS Real-Time & Day-Ahead Wind Forecast Model</span>
        </div>
      </footer>
    </div>
  );
}
