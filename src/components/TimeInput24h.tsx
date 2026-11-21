import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Zap, Check } from 'lucide-react';
import { getCurrentTime24h } from '../utils/timeUtils';

interface TimeInput24hProps {
  value: string; // "HH:MM" in 24h format (e.g. "09:00", "20:14")
  onChange: (newTime: string) => void;
  className?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);

const QUICK_MINUTES = ['00', '15', '30', '45'];

const ALL_MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

const POPOVER_WIDTH = 284;
const POPOVER_ESTIMATED_HEIGHT = 315;

export const TimeInput24h: React.FC<TimeInput24hProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(value || '09:00');
  const [liveCurrentTime, setLiveCurrentTime] = useState<string>(() =>
    getCurrentTime24h()
  );
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRawInput(value || '09:00');
  }, [value]);

  const updatePopoverPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - POPOVER_WIDTH - 12);
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + POPOVER_ESTIMATED_HEIGHT > window.innerHeight - 12) {
      top = Math.max(12, rect.top - POPOVER_ESTIMATED_HEIGHT - 6);
    }
    setPopoverCoords({ top, left });
  };

  const handleOpenPopover = () => {
    setLiveCurrentTime(getCurrentTime24h());
    updatePopoverPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    setLiveCurrentTime(getCurrentTime24h());
    updatePopoverPosition();

    const interval = setInterval(() => {
      setLiveCurrentTime(getCurrentTime24h());
    }, 5000);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleWindowChange = () => {
      updatePopoverPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open]);

  const currentParts = (value || '09:00').split(':');
  const selectedHour = currentParts[0] || '09';
  const selectedMinute = currentParts[1] || '00';

  // Auto-scroll to the active hour and minute when opening the popover
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (hoursListRef.current) {
        const activeHourEl = hoursListRef.current.querySelector(
          '[data-active-hour="true"]'
        ) as HTMLElement | null;
        if (activeHourEl) {
          activeHourEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      if (minutesListRef.current) {
        const activeMinEl = minutesListRef.current.querySelector(
          '[data-active-minute="true"]'
        ) as HTMLElement | null;
        if (activeMinEl) {
          activeMinEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [open]);

  const normalizeAndCommit = (str: string) => {
    const digits = str.replace(/\D/g, '');
    if (!digits) {
      setRawInput(value || '09:00');
      return;
    }
    let h = 9;
    let m = 0;
    if (digits.length <= 2) {
      h = parseInt(digits, 10);
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1, 3), 10);
    } else {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
    }
    h = Math.max(0, Math.min(23, isNaN(h) ? 0 : h));
    m = Math.max(0, Math.min(59, isNaN(m) ? 0 : m));
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setRawInput(formatted);
    onChange(formatted);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d:]/g, '');
    if (val.length === 2 && !val.includes(':') && rawInput.length === 1) {
      val = val + ':';
    }
    if (val.length <= 5) {
      setRawInput(val);
      if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
        onChange(val);
      }
    }
  };

  const handleSelectHour = (h: string) => {
    const next = `${h}:${selectedMinute}`;
    setRawInput(next);
    onChange(next);
  };

  const handleSelectMinute = (m: string) => {
    const next = `${selectedHour}:${m}`;
    setRawInput(next);
    onChange(next);
    setOpen(false);
  };

  const handleSelectExactCurrentTime = () => {
    const exactNow = getCurrentTime24h();
    setLiveCurrentTime(exactNow);
    setRawInput(exactNow);
    onChange(exactNow);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div
        onClick={handleOpenPopover}
        className="flex items-center gap-1.5 bg-[#090612] border border-cyan-500/35 hover:border-cyan-400 focus-within:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-cyan-200 font-mono transition-colors cursor-pointer"
      >
        <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
        <input
          type="text"
          value={rawInput}
          onFocus={handleOpenPopover}
          onChange={handleInputChange}
          onBlur={() => normalizeAndCommit(rawInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              normalizeAndCommit(rawInput);
              setOpen(false);
            }
          }}
          placeholder="00:00"
          className="w-11 bg-transparent text-center text-xs font-mono text-cyan-200 focus:outline-none"
        />
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: popoverCoords.top,
              left: popoverCoords.left,
              width: POPOVER_WIDTH,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] rounded-2xl bg-[#120b24]/98 border border-cyan-400/50 shadow-[0_20px_60px_rgba(0,0,0,0.92)] p-2.5 select-none backdrop-blur-2xl animate-popover-in"
          >
            {/* 1-Click Exact Current Time Button + Close Button */}
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={handleSelectExactCurrentTime}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/25 via-purple-500/25 to-fuchsia-500/25 hover:from-cyan-500/40 hover:to-fuchsia-500/40 border border-cyan-400/60 text-[11px] font-extrabold text-cyan-200 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Selecionar o horário exato de agora"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300/30 shrink-0" />
                <span>Agora ({liveCurrentTime})</span>
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Confirmar horário"
              >
                <Check className="w-3.5 h-3.5" />
                <span>OK</span>
              </button>
            </div>

            {/* Hours (00..23) & Minutes (00..59) Side-by-Side Columns */}
            <div className="flex gap-2">
              {/* Left Column: Hours 00..23 */}
              <div className="w-[108px] flex flex-col">
                <div className="text-[10px] font-extrabold text-cyan-300 uppercase text-center mb-1.5 tracking-wider">
                  Hora (24h)
                </div>
                <div
                  ref={hoursListRef}
                  className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 gap-1"
                >
                  {HOURS_24.map((h) => {
                    const isActive = h === selectedHour;
                    return (
                      <button
                        key={h}
                        type="button"
                        data-active-hour={isActive ? 'true' : undefined}
                        onClick={() => handleSelectHour(h)}
                        className={`py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-extrabold shadow-sm'
                            : 'text-slate-300 bg-white/[0.03] hover:bg-purple-500/25'
                        }`}
                      >
                        {h}h
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Minutes (Quick Presets + All 00..59 Exact Minutes) */}
              <div className="flex-1 flex flex-col pl-2 border-l border-purple-500/25">
                <div className="text-[10px] font-extrabold text-fuchsia-300 uppercase text-center mb-1.5 tracking-wider">
                  Minutos (:{selectedMinute})
                </div>

                {/* Quick 15-min presets */}
                <div className="grid grid-cols-4 gap-1 mb-1.5 pb-1.5 border-b border-white/10">
                  {QUICK_MINUTES.map((qm) => {
                    const isActive = qm === selectedMinute;
                    return (
                      <button
                        key={`q-${qm}`}
                        type="button"
                        onClick={() => handleSelectMinute(qm)}
                        className={`py-1 rounded-md text-[10px] font-mono font-extrabold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30'
                        }`}
                      >
                        :{qm}
                      </button>
                    );
                  })}
                </div>

                {/* All 60 Exact Minutes (:00 to :59) */}
                <div
                  ref={minutesListRef}
                  className="max-h-36 overflow-y-auto pr-0.5 grid grid-cols-3 gap-1"
                >
                  {ALL_MINUTES_60.map((m) => {
                    const isActive = m === selectedMinute;
                    return (
                      <button
                        key={m}
                        type="button"
                        data-active-minute={isActive ? 'true' : undefined}
                        onClick={() => handleSelectMinute(m)}
                        className={`py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-extrabold shadow-sm'
                            : 'text-slate-300 bg-white/[0.03] hover:bg-purple-500/25'
                        }`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
