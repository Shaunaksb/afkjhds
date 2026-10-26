import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ProcurementSimulationResponse } from '../types';
import { Flame } from 'lucide-react';

interface Props {
  selectedDate: string;
  cutoffTime: string;
}

export const ProcurementSimulator: React.FC<Props> = ({ selectedDate, cutoffTime }) => {
  const [baseDemand, setBaseDemand] = useState<number>(16000);
  const [profile, setProfile] = useState<string>('winter_typical');
  const [confidence, setConfidence] = useState<number>(0.90);
  const [, setLoading] = useState<boolean>(false);
  const [simData, setSimData] = useState<ProcurementSimulationResponse | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const runSimulation = async () => {
      try {
        setLoading(true);
        const res = await api.simulateProcurement({
          date: selectedDate,
          cutoff: cutoffTime,
          baseDemandMW: baseDemand,
          demandProfile: profile,
          confidenceLevel: confidence,
        });
        if (isCurrent) setSimData(res);
      } catch (err) {
        console.error('Procurement simulation failed:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    runSimulation();
    return () => {
      isCurrent = false;
    };
  }, [selectedDate, cutoffTime, baseDemand, profile, confidence]);

  const sim = simData?.simulation;

  return (
    <div className="bg-trading-card border border-trading-border rounded-xl p-5 shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span>Day-Ahead Thermal Power Procurement Simulator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Model wholesale procurement requirements and empirical reserve margins to protect against balancing penalties.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-trading-border px-3 py-1.5 rounded-lg text-slate-300">
          <span className="text-slate-400">Decision Target:</span>
          <span className="font-mono text-cyan-400 font-bold">{selectedDate} @ {cutoffTime} GMT</span>
        </div>
      </div>

      {/* Simulator Control Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-5">
        
        {/* Base Demand Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
            <span>Peak Consumer Demand (MW)</span>
            <span className="font-mono text-cyan-400">{baseDemand.toLocaleString()} MW</span>
          </label>
          <input
            type="range"
            min="5000"
            max="30000"
            step="500"
            value={baseDemand}
            onChange={(e) => setBaseDemand(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>5,000 MW</span>
            <span>15,000 MW (Standard)</span>
            <span>30,000 MW</span>
          </div>
        </div>

        {/* Profile Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Demand Shape Model
          </label>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            <option value="winter_typical">UK Winter Typical (Dual-Peak: 08:00 & 17:30)</option>
            <option value="flat">Flat Base Load (Constant Across 48 SPs)</option>
          </select>
          <div className="text-[10px] text-slate-500 mt-1">
            Replicates residential + commercial heating spikes
          </div>
        </div>

        {/* Risk Confidence Level */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
            <span>Safety Reserve Confidence (P{intRound(confidence * 100)})</span>
            <span className="font-mono text-orange-400">+{sim?.safetyBufferMW ?? 0} MW Reserve</span>
          </label>
          <input
            type="range"
            min="0.50"
            max="0.99"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>P50 (Median)</span>
            <span>P90 (Conservative)</span>
            <span>P99 (Max Protection)</span>
          </div>
        </div>

      </div>

      {/* Simulator KPI Outputs */}
      {sim && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs">Total Consumer Demand</div>
            <div className="text-xl font-bold text-white font-mono-numbers mt-1">
              {sim.totalDemandMWh.toLocaleString()} <span className="text-xs text-slate-400">MWh</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across 48 Settlement Periods</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs">Expected Wind Energy</div>
            <div className="text-xl font-bold text-sky-400 font-mono-numbers mt-1">
              {sim.totalWindForecastMWh.toLocaleString()} <span className="text-xs text-slate-400">MWh</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Actual Outturn: {sim.totalActualWindMWh.toLocaleString()} MWh
            </div>
          </div>

          <div className="bg-slate-900 border border-orange-900/40 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs">Thermal Day-Ahead Order</div>
            <div className="text-xl font-bold text-orange-400 font-mono-numbers mt-1">
              {sim.totalThermalProcuredMWh.toLocaleString()} <span className="text-xs text-slate-400">MWh</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Net thermal generation required</div>
          </div>

          <div className="bg-slate-900 border border-red-900/40 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs">Unbuffered Cash-Out Deficit</div>
            <div className="text-xl font-bold text-red-400 font-mono-numbers mt-1">
              {sim.totalUncoveredDeficitMWh.toLocaleString()} <span className="text-xs text-slate-400">MWh</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Protected by +{sim.safetyBufferMW} MW buffer
            </div>
          </div>

        </div>
      )}

      {/* Settlement Period Schedule Table Preview */}
      {sim && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">SP</th>
                <th className="py-2.5 px-3">Start Time</th>
                <th className="py-2.5 px-3 text-right">Demand (MW)</th>
                <th className="py-2.5 px-3 text-right text-sky-400">Wind Forecast</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Actual Wind</th>
                <th className="py-2.5 px-3 text-right text-orange-400">Base Thermal Buy</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Buffered Buy (+{sim.safetyBufferMW} MW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sim.schedule.slice(0, 10).map((row) => (
                <tr key={row.settlementPeriod} className="hover:bg-slate-800/40 transition font-mono-numbers">
                  <td className="py-2 px-3 text-slate-400">{row.settlementPeriod}</td>
                  <td className="py-2 px-3 text-slate-300">{row.startTime.substring(11, 16)} GMT</td>
                  <td className="py-2 px-3 text-right text-white font-semibold">{row.demandMW.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-sky-400">{row.windForecastMW.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">{row.actualWindMW.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-orange-400 font-bold">{row.baseThermalOrderMW.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-amber-300 font-bold">{row.recommendedBufferedOrderMW.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-900/80 px-3 py-2 text-[11px] text-slate-500 text-center border-t border-slate-800">
            Showing first 10 of 48 Settlement Periods · Full 24-hour schedule exported via API
          </div>
        </div>
      )}
    </div>
  );
};

function intRound(num: number): number {
  return Math.round(num);
}
