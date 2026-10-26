import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { SettlementPeriodRecord } from '../types';
import { Info } from 'lucide-react';

interface Props {
  data: SettlementPeriodRecord[];
  deliveryDate: string;
  marketCutoffTime: string;
}

export const WindHorizonChart: React.FC<Props> = ({ data, deliveryDate, marketCutoffTime }) => {
  // Format data for Recharts
  const chartData = data.map((d) => {
    const act = d.actualGeneration ?? 0;
    const fc = d.forecastGeneration ?? 0;
    const delta = d.errorDelta ?? 0;

    return {
      sp: d.settlementPeriod,
      label: `SP ${d.settlementPeriod} (${d.startTime.substring(11, 16)})`,
      time: d.startTime.substring(11, 16),
      actual: act,
      forecast: fc,
      delta: delta,
      overForecastDeficit: delta > 0 ? delta : 0,
      underForecastSurplus: delta < 0 ? Math.abs(delta) : 0,
      publishTime: d.forecastPublishTime ? d.forecastPublishTime.substring(11, 16) : 'N/A',
    };
  });

  return (
    <div className="bg-trading-card border border-trading-border rounded-xl p-5 shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Wind Generation: Actual Outturn vs. Day-Ahead Forecast</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
              48 Settlement Periods (30m)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Delivery: <span className="text-cyan-400 font-mono font-medium">{deliveryDate}</span> · As-of D-1 Cutoff:{' '}
            <span className="text-cyan-400 font-mono font-medium">{marketCutoffTime} GMT</span>
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#10B981] inline-block"></span>
            <span className="text-slate-300">Actual (FUELHH)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#38BDF8] inline-block border-b border-dashed border-[#38BDF8]"></span>
            <span className="text-slate-300">Forecast (WINDFOR)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/20 border border-red-500/40 inline-block"></span>
            <span className="text-red-400">Over-forecast Deficit</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />

            {/* Shaded Peak Hour Bands */}
            <ReferenceArea
              x1="SP 15 (07:00)"
              x2="SP 18 (08:30)"
              strokeOpacity={0.2}
              fill="#F59E0B"
              fillOpacity={0.05}
              label={{ value: 'Morning Peak', position: 'insideTop', fill: '#D97706', fontSize: 10 }}
            />
            <ReferenceArea
              x1="SP 33 (16:00)"
              x2="SP 38 (18:30)"
              strokeOpacity={0.2}
              fill="#EF4444"
              fillOpacity={0.05}
              label={{ value: 'Evening Peak (Max Imbalance Risk)', position: 'insideTop', fill: '#EF4444', fontSize: 10 }}
            />

            <XAxis
              dataKey="label"
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              interval={3}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
              unit=" MW"
              tick={{ fill: '#9CA3AF' }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  const delta = p.delta;
                  const isOver = delta > 0;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs backdrop-blur font-mono">
                      <div className="font-bold text-white mb-1.5 pb-1 border-b border-slate-800 flex justify-between gap-4">
                        <span>{p.label}</span>
                        <span className="text-slate-400">Published: {p.publishTime} GMT</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Actual Generation:</span>
                          <span className="font-bold font-mono-numbers">{p.actual.toLocaleString()} MW</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sky-400">
                          <span>Day-Ahead Forecast:</span>
                          <span className="font-bold font-mono-numbers">{p.forecast.toLocaleString()} MW</span>
                        </div>
                        <div
                          className={`flex justify-between gap-4 pt-1 mt-1 border-t border-slate-800 font-bold ${
                            isOver ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          <span>{isOver ? 'Over-Forecast (Deficit):' : 'Under-Forecast (Surplus):'}</span>
                          <span className="font-mono-numbers">
                            {isOver ? `+${delta.toLocaleString()} MW` : `${delta.toLocaleString()} MW`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Error Deficit Area */}
            <Area
              type="monotone"
              dataKey="overForecastDeficit"
              fill="url(#deficitGradient)"
              stroke="#EF4444"
              strokeWidth={1}
              strokeDasharray="2 2"
              name="Deficit Risk"
            />

            {/* Main generation curves */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10B981' }}
              name="Actual Wind"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#38BDF8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5, fill: '#38BDF8' }}
              name="Day-Ahead Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-trading-border flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Highlighted regions show UK demand peak periods where power price volatility and cash-out penalty risks are highest.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">Source: Elexon BMRS FUELHH & WINDFOR Streams</div>
      </div>
    </div>
  );
};
