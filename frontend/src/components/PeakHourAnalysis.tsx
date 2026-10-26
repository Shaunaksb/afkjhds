import React from 'react';
import { PeakPeriodMetric } from '../types';
import { Sunrise, Sunset, Moon } from 'lucide-react';

interface Props {
  peakAnalysis: {
    morningPeak: PeakPeriodMetric;
    eveningPeak: PeakPeriodMetric;
    offPeak: PeakPeriodMetric;
  };
}

export const PeakHourAnalysis: React.FC<Props> = ({ peakAnalysis }) => {
  const { morningPeak, eveningPeak, offPeak } = peakAnalysis;

  return (
    <div className="bg-trading-card border border-trading-border rounded-xl p-5 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Peak Demand Window Stress Analysis</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-mono border border-amber-800/40">
              Imbalance Risk Focus
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Errors during peak hours carry 5x–10x higher cash-out penalty exposure in the UK Balancing Mechanism.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Morning Peak */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Sunrise className="w-4 h-4" />
              <span>Morning Peak (SP 15–18)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">07:00–09:00 GMT</span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500 font-sans">Window MAE:</span>
              <span className="font-bold text-white font-mono-numbers">{morningPeak?.mae ?? 0} MW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Systemic Bias:</span>
              <span
                className={`font-bold font-mono-numbers ${
                  (morningPeak?.bias ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {(morningPeak?.bias ?? 0) > 0 ? `+${morningPeak?.bias}` : morningPeak?.bias ?? 0} MW
              </span>
            </div>
          </div>
        </div>

        {/* Evening Peak */}
        <div className="bg-slate-900/80 border border-red-900/40 rounded-lg p-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-red-500/30"></div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
              <Sunset className="w-4 h-4" />
              <span>Evening Peak (SP 33–38)</span>
            </div>
            <span className="text-[11px] font-mono text-red-400/80 font-bold">Max Volatility</span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500 font-sans">Window MAE:</span>
              <span className="font-bold text-white font-mono-numbers">{eveningPeak?.mae ?? 0} MW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Systemic Bias:</span>
              <span
                className={`font-bold font-mono-numbers ${
                  (eveningPeak?.bias ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {(eveningPeak?.bias ?? 0) > 0 ? `+${eveningPeak?.bias}` : eveningPeak?.bias ?? 0} MW
              </span>
            </div>
          </div>
        </div>

        {/* Off-Peak Base */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
              <Moon className="w-4 h-4" />
              <span>Off-Peak & Base Load</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Remaining 38 SPs</span>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500 font-sans">Window MAE:</span>
              <span className="font-bold text-white font-mono-numbers">{offPeak?.mae ?? 0} MW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Systemic Bias:</span>
              <span
                className={`font-bold font-mono-numbers ${
                  (offPeak?.bias ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {(offPeak?.bias ?? 0) > 0 ? `+${offPeak?.bias}` : offPeak?.bias ?? 0} MW
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
