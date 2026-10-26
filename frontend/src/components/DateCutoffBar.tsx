import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
  cutoffTime: string;
  onSelectCutoffTime: (time: string) => void;
  cutoffISO: string;
}

const PRESET_CUTOFFS = [
  { label: '08:00 (Early)', value: '08:00', desc: 'Early morning preliminary run' },
  { label: '11:00 (EPEX Gate)', value: '11:00', desc: 'Standard UK Day-Ahead wholesale auction close' },
  { label: '12:00 (N2EX)', value: '12:00', desc: 'Nord Pool / N2EX clearing deadline' },
  { label: '16:00 (Late)', value: '16:00', desc: 'Post-auction afternoon model update' },
];

export const DateCutoffBar: React.FC<Props> = ({
  selectedDate,
  onSelectDate,
  availableDates,
  cutoffTime,
  onSelectCutoffTime,
  cutoffISO,
}) => {
  return (
    <div className="bg-trading-card border border-trading-border rounded-xl p-4 shadow-lg mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
        
        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Target Delivery Day:</span>
          </div>

          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-slate-900 border border-trading-border text-white text-sm rounded-lg px-3.5 py-2 font-mono-numbers focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} (Delivery Day D)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['2026-01-05', '2026-01-10', '2026-01-15', '2026-01-20', '2026-01-25'].map((d) => (
              <button
                key={d}
                onClick={() => onSelectDate(d)}
                className={`text-xs px-2.5 py-1 rounded font-mono transition ${
                  selectedDate === d
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                Jan {d.split('-')[2]}
              </button>
            ))}
          </div>
        </div>

        {/* Gate Closure Cutoff Slider & Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-trading-border">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>D-1 Gate Closure Cutoff:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-trading-border">
            {PRESET_CUTOFFS.map((item) => (
              <button
                key={item.value}
                onClick={() => onSelectCutoffTime(item.value)}
                title={item.desc}
                className={`text-xs px-3 py-1.5 rounded-md font-mono transition ${
                  cutoffTime === item.value
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Point-in-time timestamp proof */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800" title="Exact timestamp cutoff applied to Elexon WINDFOR stream">
            <span className="text-slate-500">As-of:</span>
            <span className="text-cyan-400 font-semibold">{cutoffISO || 'D-1 Cutoff'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
