import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeInput24hProps {
  value: string; // "HH:MM" in 24h format (e.g. "09:00", "13:30")
  onChange: (newTime: string) => void;
  className?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);
const MINUTES_STEP = ['00', '10', '15', '20', '30', '40', '45', '50'];

export const TimeInput24h: React.FC<TimeInput24hProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(value || '09:00');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRawInput(value || '09:00');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentParts = (value || '09:00').split(':');
  const selectedHour = currentParts[0] || '09';
  const selectedMinute = currentParts[1] || '00';

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

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-[#090612] border border-cyan-500/35 hover:border-cyan-400 focus-within:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-cyan-200 font-mono transition-colors cursor-pointer"
      >
        <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
        <input
          type="text"
          value={rawInput}
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

      {open && (
        <div className="absolute left-0 mt-1.5 z-50 w-48 rounded-xl bg-[#120b24] border border-purple-500/40 shadow-2xl shadow-black/80 p-2 flex gap-2 select-none">
          {/* Hours 00..23 */}
          <div className="flex-1 max-h-44 overflow-y-auto pr-1">
            <div className="text-[10px] font-bold text-cyan-300 uppercase text-center mb-1">
              Hora (24h)
            </div>
            <div className="grid grid-cols-2 gap-1">
              {HOURS_24.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectHour(h)}
                  className={`py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    h === selectedHour
                      ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-bold'
                      : 'text-slate-300 hover:bg-purple-500/25'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div className="w-16 max-h-44 overflow-y-auto pl-1 border-l border-purple-500/20">
            <div className="text-[10px] font-bold text-fuchsia-300 uppercase text-center mb-1">
              Min
            </div>
            <div className="space-y-1">
              {MINUTES_STEP.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMinute(m)}
                  className={`w-full py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    m === selectedMinute
                      ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-bold'
                      : 'text-slate-300 hover:bg-purple-500/25'
                  }`}
                >
                  :{m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
