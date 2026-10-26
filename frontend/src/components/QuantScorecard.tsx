import React from 'react';
import { AccuracyMetrics } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, Target, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
  metrics: AccuracyMetrics;
}

export const QuantScorecard: React.FC<Props> = ({ metrics }) => {
  const isHighDeficit = metrics.riskLevel === 'HIGH_DEFICIT_RISK';
  const isSurplus = metrics.riskLevel === 'SURPLUS_RISK';

  return (
    <div className="space-y-4 mb-6">
      {/* Top Banner Alert for Trading Desk */}
      <div
        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          isHighDeficit
            ? 'bg-red-950/40 border-red-800/60 text-red-200'
            : isSurplus
            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isHighDeficit ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : isSurplus ? (
            <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <div>
            <span className="font-bold uppercase tracking-wider font-mono mr-2">
              [{metrics.riskLevel}]
            </span>
            <span>{metrics.riskLabel}</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          Evaluated across {metrics.sampleCount} half-hour settlement periods
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* MAE */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Mean Absolute Error (MAE)</span>
            <Target className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-numbers">
            {metrics.mae.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Average forecast magnitude miss</div>
        </div>

        {/* RMSE */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Root Mean Squared (RMSE)</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-numbers">
            {metrics.rmse.toLocaleString()} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Heavily penalizes tail-risk misses</div>
        </div>

        {/* Mean Bias */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Systemic Bias (Mean Error)</span>
            {metrics.bias > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono-numbers ${
              metrics.bias > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.bias > 0 ? 'Over-forecasting (Under-buy risk)' : 'Under-forecasting (Over-buy risk)'}
          </div>
        </div>

        {/* WAPE (Weighted Absolute Percentage Error) */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Normalized WAPE</span>
            <span className="text-[10px] font-mono text-cyan-400">Vol-Weighted</span>
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono-numbers">
            {metrics.wape.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Standard MAPE: {metrics.mape.toFixed(1)}% (near-zero guarded)
          </div>
        </div>

      </div>

      {/* Secondary Metrics / Distribution Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        
        {/* Over vs Under Count */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-slate-400 font-medium">Periods Over-forecast vs Under-forecast</div>
            <div className="text-slate-500 text-[11px] mt-0.5">48 settlement periods total</div>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold">
            <span className="text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/60">
              {metrics.overForecastCount} Over
            </span>
            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
              {metrics.underForecastCount} Under
            </span>
          </div>
        </div>

        {/* Max Peak Errors */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-slate-400 font-medium">Worst Settlement Period Miss</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Maximum single half-hour deviation</div>
          </div>
          <div className="font-mono text-right">
            <div className="text-red-400 font-bold font-mono-numbers">+{metrics.maxOverForecast.toLocaleString()} MW (Deficit)</div>
            <div className="text-emerald-400 text-[11px] font-mono-numbers">-{metrics.maxUnderForecast.toLocaleString()} MW (Surplus)</div>
          </div>
        </div>

        {/* Quantile Error Intervals */}
        <div className="bg-trading-card border border-trading-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-slate-400 font-medium">Error Quantiles (P10 / P50 / P90)</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Empirical uncertainty envelope</div>
          </div>
          <div className="font-mono text-xs text-right font-mono-numbers">
            <span className="text-emerald-400">{metrics.percentiles.p10}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-white font-bold">{metrics.percentiles.p50}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-red-400 font-bold">+{metrics.percentiles.p90} MW</span>
          </div>
        </div>

      </div>
    </div>
  );
};
