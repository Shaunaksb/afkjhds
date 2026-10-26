import React, { useState, useEffect } from 'react';
import { MonthlyMetricsResponse } from '../types';
import { api } from '../services/api';
import { X, Calendar, BarChart3 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cutoffTime: string;
  onSelectDate: (date: string) => void;
}

export const MonthlySummaryModal: React.FC<Props> = ({ isOpen, onClose, cutoffTime, onSelectDate }) => {
  const [data, setData] = useState<MonthlyMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;

    const fetchMonthly = async () => {
      try {
        setLoading(true);
        const res = await api.getMonthlyMetrics('2026-01', cutoffTime);
        if (isCurrent) setData(res);
      } catch (err) {
        console.error('Failed to load monthly metrics:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchMonthly();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, cutoffTime]);

  if (!isOpen) return null;

  const s = data?.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-trading-card border border-trading-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-trading-border bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                January 2026 Full-Month Forecast Accuracy Audit
              </h3>
              <p className="text-xs text-slate-400">
                Evaluation across all {data?.daysCount ?? 31} days ({data?.totalSettlementPeriods ?? 1488} Settlement Periods) at D-1 {cutoffTime} GMT Cutoff
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center text-slate-400 text-sm font-mono animate-pulse">
              Calculating quantitative aggregates across January 2026 Elexon streams...
            </div>
          )}

          {!loading && s && (
            <>
              {/* Monthly Aggregate KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-slate-400 text-xs">Monthly MAE</div>
                  <div className="text-xl font-bold text-white font-mono-numbers mt-1">
                    {s.mae.toLocaleString()} <span className="text-xs text-slate-400">MW</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Average absolute error</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-slate-400 text-xs">Monthly RMSE</div>
                  <div className="text-xl font-bold text-white font-mono-numbers mt-1">
                    {s.rmse.toLocaleString()} <span className="text-xs text-slate-400">MW</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Volatility & tail-risk penalty</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-slate-400 text-xs">Systemic Month Bias</div>
                  <div
                    className={`text-xl font-bold font-mono-numbers mt-1 ${
                      s.bias > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {s.bias > 0 ? `+${s.bias}` : s.bias} <span className="text-xs text-slate-400">MW</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.bias > 0 ? 'Persistent Over-forecast' : 'Persistent Under-forecast'}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-slate-400 text-xs">Monthly WAPE</div>
                  <div className="text-xl font-bold text-cyan-400 font-mono-numbers mt-1">
                    {s.wape.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Volume-weighted percentage</div>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 font-mono">
                  Daily Forecast Error Breakdown (Click any row to view in Cockpit)
                </h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Delivery Date</th>
                        <th className="py-2.5 px-3 text-right">MAE (MW)</th>
                        <th className="py-2.5 px-3 text-right">RMSE (MW)</th>
                        <th className="py-2.5 px-3 text-right">Bias (MW)</th>
                        <th className="py-2.5 px-3 text-right">WAPE (%)</th>
                        <th className="py-2.5 px-3 text-center">Risk Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {data?.dailyBreakdown.map((row) => (
                        <tr
                          key={row.date}
                          onClick={() => {
                            onSelectDate(row.date);
                            onClose();
                          }}
                          className="hover:bg-cyan-500/10 cursor-pointer transition font-mono-numbers"
                        >
                          <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{row.date}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{row.mae.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{row.rmse.toLocaleString()}</td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              row.bias > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {row.bias > 0 ? `+${row.bias.toLocaleString()}` : row.bias.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right text-cyan-300">{row.wape.toFixed(1)}%</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                row.riskLevel === 'HIGH_DEFICIT_RISK'
                                  ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                                  : row.riskLevel === 'SURPLUS_RISK'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {row.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-trading-border bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Source: National Grid ESO WINDFOR vs FUELHH Stream via Elexon BMRS API</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
