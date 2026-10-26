import React, { useState } from 'react';
import { Wind, RefreshCw, BarChart2 } from 'lucide-react';
import { HealthResponse } from '../types';
import { api } from '../services/api';

interface Props {
  health: HealthResponse | null;
  onOpenMonthlyModal: () => void;
  onSyncComplete?: () => void;
}

export const Navbar: React.FC<Props> = ({ health, onOpenMonthlyModal }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await api.triggerSync(31);
      setSyncMsg(res.message);
      setTimeout(() => setSyncMsg(null), 4000);
    } catch {
      setSyncMsg('Sync trigger failed');
      setTimeout(() => setSyncMsg(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="border-b border-trading-border bg-trading-bg/95 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Market Context */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-lg">GRIDBRICKS</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 font-mono border border-cyan-800/50">
                UK Day-Ahead Power
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Elexon BMRS Wind Generation & Wholesale Procurement Decision Cockpit
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center gap-3 flex-wrap justify-end text-xs">
          {health && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-trading-border text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono-numbers">
                {health.database.actualCount.toLocaleString()} Actuals / {health.database.forecastCount.toLocaleString()} Forecasts
              </span>
            </div>
          )}

          <button
            onClick={onOpenMonthlyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Inspect entire January 2026 forecast error distributions and metrics"
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Monthly Audit</span>
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition disabled:opacity-50 shadow-sm shadow-cyan-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Elexon'}</span>
          </button>

          {syncMsg && (
            <div className="text-[11px] text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-700/60 animate-fade-in">
              {syncMsg}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
