import React from 'react';
import { Repeat } from 'lucide-react';
import { RecurrenceConfig } from '../types';

const WEEKDAY_OPTIONS = [
  { idx: 0, short: 'Dom', letter: 'D' },
  { idx: 1, short: 'Seg', letter: 'S' },
  { idx: 2, short: 'Ter', letter: 'T' },
  { idx: 3, short: 'Qua', letter: 'Q' },
  { idx: 4, short: 'Qui', letter: 'Q' },
  { idx: 5, short: 'Sex', letter: 'S' },
  { idx: 6, short: 'Sáb', letter: 'S' },
];

export const DEFAULT_RECURRENCE_CONFIG: RecurrenceConfig = {
  enabled: false,
  mode: 'weekdays',
  weekdays: [1, 2, 3, 4, 5],
  daysCount: 4,
};

interface RecurrenceButtonProps {
  config: RecurrenceConfig;
  onChange: (next: RecurrenceConfig) => void;
  compact?: boolean;
}

export const RecurrenceButton: React.FC<RecurrenceButtonProps> = ({
  config,
  onChange,
  compact = false,
}) => {
  const getSummaryBadge = () => {
    if (!config.enabled) return null;
    if (config.mode === 'days_count') {
      return `${config.daysCount}d`;
    }
    if (config.weekdays.length === 7) return 'Todo dia';
    if (
      config.weekdays.length === 5 &&
      [1, 2, 3, 4, 5].every((d) => config.weekdays.includes(d))
    ) {
      return 'Seg-Sex';
    }
    return `${config.weekdays.length}x/sem`;
  };

  const summary = getSummaryBadge();

  return (
    <button
      type="button"
      onClick={() => onChange({ ...config, enabled: !config.enabled })}
      title="Configurar tarefa de Rotina (dias da semana ou duração por dias)"
      className={`inline-flex items-center gap-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
      } ${
        config.enabled
          ? 'bg-gradient-to-r from-cyan-500/35 via-fuchsia-500/25 to-purple-600/35 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/25'
          : 'bg-[#150d28] border-purple-500/40 text-purple-200 hover:text-white hover:border-pink-400/70 shadow-sm'
      }`}
    >
      <Repeat
        className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${
          config.enabled ? 'text-cyan-300' : 'text-pink-400'
        }`}
      />
      <span>Rotina</span>
      {summary && (
        <span className="px-1.5 py-0.5 rounded bg-cyan-400/25 border border-cyan-400/40 text-cyan-200 text-[9px] font-extrabold leading-none">
          {summary}
        </span>
      )}
    </button>
  );
};

interface RecurrencePanelProps {
  config: RecurrenceConfig;
  onChange: (next: RecurrenceConfig) => void;
}

export const RecurrencePanel: React.FC<RecurrencePanelProps> = ({
  config,
  onChange,
}) => {
  if (!config.enabled) return null;

  const toggleWeekday = (dayIdx: number) => {
    const exists = config.weekdays.includes(dayIdx);
    const nextDays = exists
      ? config.weekdays.filter((d) => d !== dayIdx)
      : [...config.weekdays, dayIdx].sort((a, b) => a - b);

    // Keep at least 1 day selected
    if (nextDays.length === 0) return;
    onChange({ ...config, weekdays: nextDays });
  };

  return (
    <div className="p-2.5 rounded-xl bg-[#090612]/95 border border-cyan-400/40 space-y-2.5 animate-fade-in">
      {/* Mode Switcher Tabs: Dias da Semana vs Quantidade de Dias */}
      <div className="grid grid-cols-2 gap-1 bg-[#140d29] p-1 rounded-lg border border-purple-500/25">
        <button
          type="button"
          onClick={() => onChange({ ...config, mode: 'weekdays' })}
          className={`py-1 px-2 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
            config.mode === 'weekdays'
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Dias da Semana
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...config, mode: 'days_count' })}
          className={`py-1 px-2 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
            config.mode === 'days_count'
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Por Dias (Duração)
        </button>
      </div>

      {config.mode === 'weekdays' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300 font-semibold">
              Repetir nos dias:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...config, weekdays: [1, 2, 3, 4, 5] })
                }
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-bold text-cyan-300 cursor-pointer"
              >
                Seg-Sex
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...config, weekdays: [0, 1, 2, 3, 4, 5, 6] })
                }
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-bold text-pink-300 cursor-pointer"
              >
                Todo dia
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_OPTIONS.map((w) => {
              const active = config.weekdays.includes(w.idx);
              return (
                <button
                  key={w.idx}
                  type="button"
                  onClick={() => toggleWeekday(w.idx)}
                  className={`py-1.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-b from-purple-500 to-pink-500 border-pink-300 text-white shadow-sm shadow-pink-500/30'
                      : 'bg-[#120b24] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-300 font-semibold">
              Repetir pelos próximos:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={60}
                value={config.daysCount}
                onChange={(e) => {
                  const val = Math.max(
                    1,
                    Math.min(60, parseInt(e.target.value, 10) || 1)
                  );
                  onChange({ ...config, daysCount: val });
                }}
                className="w-14 bg-[#120b24] border border-cyan-400/50 rounded-lg px-2 py-1 text-xs font-extrabold text-center text-cyan-200 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-cyan-300">
                {config.daysCount === 1 ? 'dia' : 'dias seguidos'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[2, 3, 4, 5, 7, 14].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ ...config, daysCount: n })}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                  config.daysCount === n
                    ? 'bg-cyan-500/30 border-cyan-300 text-cyan-200'
                    : 'bg-[#120b24] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
