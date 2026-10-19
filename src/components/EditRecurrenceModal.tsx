import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Repeat,
  X,
  Plus,
  Minus,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { TaskCard } from '../types';

interface EditRecurrenceModalProps {
  isOpen: boolean;
  card: TaskCard;
  onClose: () => void;
  onSave: (payload: {
    mode: 'weekdays' | 'specific_days' | 'days_count';
    weekdays?: number[];
    specificDays?: number[];
    daysCount?: number;
  }) => void;
}

const WEEKDAY_NAMES = [
  { day: 0, label: 'Dom', full: 'Domingo' },
  { day: 1, label: 'Seg', full: 'Segunda-feira' },
  { day: 2, label: 'Ter', full: 'Terça-feira' },
  { day: 3, label: 'Qua', full: 'Quarta-feira' },
  { day: 4, label: 'Qui', full: 'Quinta-feira' },
  { day: 5, label: 'Sex', full: 'Sexta-feira' },
  { day: 6, label: 'Sáb', full: 'Sábado' },
];

export function EditRecurrenceModal({
  isOpen,
  card,
  onClose,
  onSave,
}: EditRecurrenceModalProps) {
  const initialMode = card.recurrence?.mode || 'days_count';
  const [mode, setMode] = useState<'weekdays' | 'specific_days' | 'days_count'>(
    initialMode
  );

  // Mode 1: Weekdays
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(() => {
    if (card.recurrence?.weekdays && card.recurrence.weekdays.length > 0) {
      return [...card.recurrence.weekdays];
    }
    // Default to the weekday of this card's scheduledDate
    const parts = (card.scheduledDate || '').split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      return [d];
    }
    return [1]; // Segunda
  });

  // Mode 2: Specific days of month
  const [selectedSpecificDays, setSelectedSpecificDays] = useState<number[]>(
    () => {
      if (
        card.recurrence?.specificDays &&
        card.recurrence.specificDays.length > 0
      ) {
        return [...card.recurrence.specificDays].sort((a, b) => a - b);
      }
      const dayNum = parseInt((card.scheduledDate || '').split('-')[2], 10) || 1;
      return [dayNum];
    }
  );

  // Mode 3: Days count (prazo / consecutivos)
  const [daysCount, setDaysCount] = useState<number>(() => {
    return card.recurrence?.daysCount && card.recurrence.daysCount > 0
      ? card.recurrence.daysCount
      : 2;
  });

  if (!isOpen) return null;

  // Weekdays toggle handler (ensuring at least 1 day remains checked)
  const toggleWeekday = (d: number) => {
    if (selectedWeekdays.includes(d)) {
      if (selectedWeekdays.length === 1) return; // Prevent 0 days
      setSelectedWeekdays(selectedWeekdays.filter((w) => w !== d));
    } else {
      setSelectedWeekdays([...selectedWeekdays, d].sort((a, b) => a - b));
    }
  };

  // Specific days toggle handler
  const toggleSpecificDay = (dayNum: number) => {
    if (selectedSpecificDays.includes(dayNum)) {
      if (selectedSpecificDays.length === 1) return;
      setSelectedSpecificDays(
        selectedSpecificDays.filter((d) => d !== dayNum).sort((a, b) => a - b)
      );
    } else {
      setSelectedSpecificDays(
        [...selectedSpecificDays, dayNum].sort((a, b) => a - b)
      );
    }
  };

  // Days count stepper handlers
  const handleIncrementDays = () => {
    setDaysCount((prev) => Math.min(60, prev + 1));
  };

  const handleDecrementDays = () => {
    setDaysCount((prev) => Math.max(1, prev - 1));
  };

  const handleSave = () => {
    if (mode === 'weekdays') {
      if (selectedWeekdays.length === 0) return;
      onSave({
        mode: 'weekdays',
        weekdays: selectedWeekdays,
      });
    } else if (mode === 'specific_days') {
      if (selectedSpecificDays.length === 0) return;
      onSave({
        mode: 'specific_days',
        specificDays: selectedSpecificDays,
      });
    } else {
      onSave({
        mode: 'days_count',
        daysCount,
      });
    }
    onClose();
  };

  // Extract month info for specific days grid
  const [y, m, d] = (card.scheduledDate || '').split('-').map(Number);
  const currentYear = y || new Date().getFullYear();
  const currentMonth = m || new Date().getMonth() + 1;
  const currentDayNum = d || 1;
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-[#0e081e] border-2 border-cyan-400/50 shadow-2xl shadow-cyan-950/80 p-6 text-slate-100 animate-spring-pop overflow-hidden"
      >
        {/* Top Glowing Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500" />

        {/* Header: Title + Close */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Calendar className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide font-display">
                Editar / Adicionar Dia
              </h3>
              <p className="text-xs text-slate-400">
                Configure a periodicidade e os dias da tarefa no calendário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setMode('weekdays')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'weekdays'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Dias da Semana</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('specific_days')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'specific_days'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Dias Específicos</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('days_count')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'days_count'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Prazo / Por Dias</span>
          </button>
        </div>

        {/* Content Panel based on Mode */}
        <div className="p-4 rounded-xl bg-[#090514] border border-purple-500/30 space-y-4 mb-6">
          {/* 1. DIAS DA SEMANA */}
          {mode === 'weekdays' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Selecione os dias da semana para a rotina:
                </span>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                  {selectedWeekdays.length} dia(s) marcado(s)
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_NAMES.map(({ day, label, full }) => {
                  const isChecked = selectedWeekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      title={full}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isChecked
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-400/30 text-[11px] text-cyan-200 leading-relaxed">
                💡 <strong>Atenção:</strong> As alterações de dias da semana serão aplicadas <strong>dali para frente</strong> a partir da data desta tarefa (<strong>{card.scheduledDate}</strong>) até o final do mês. Tarefas anteriores não serão afetadas. Pelo menos 1 dia deve ficar marcado.
              </div>
            </div>
          )}

          {/* 2. DIAS ESPECÍFICOS (COM SISTEMA DE PARTES) */}
          {mode === 'specific_days' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Marque os dias do mês em que a tarefa será realizada:
                </span>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 rounded-md">
                  {selectedSpecificDays.length} parte(s)
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-1">
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map(
                  (dayNum) => {
                    const isChecked = selectedSpecificDays.includes(dayNum);
                    const isToday = dayNum === currentDayNum;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => toggleSpecificDay(dayNum)}
                        className={`h-9 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
                          isChecked
                            ? 'bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white border-fuchsia-400 shadow-md shadow-purple-500/30 ring-1 ring-fuchsia-300'
                            : isToday
                            ? 'bg-white/10 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-400/30 text-[11px] text-purple-200 leading-relaxed">
                📋 <strong>Sistema de Partes:</strong> Cada dia selecionado corresponderá a uma parte da tarefa (ex: <em>Parte 1 de {selectedSpecificDays.length}</em>). Todas as partes devem ser finalizadas para a demanda constar como 100% realizada.
              </div>
            </div>
          )}

          {/* 3. PRAZO / DIAS CONSECUTIVOS (COM SISTEMA DE PARTES E STEPPER) */}
          {mode === 'days_count' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-300">
                Quantos dias consecutivos essa tarefa vai durar?
              </div>

              <div className="flex items-center justify-center gap-6 py-2">
                <button
                  type="button"
                  onClick={handleDecrementDays}
                  disabled={daysCount <= 1}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <span className="text-3xl font-black text-white font-mono block">
                    {daysCount}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                    {daysCount === 1 ? 'Dia (1 Parte)' : `${daysCount} Dias (${daysCount} Partes)`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleIncrementDays}
                  disabled={daysCount >= 60}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-cyan-500/30"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-300 leading-relaxed">
                ⏱️ <strong>Aumentar ou Encurtar Prazo:</strong> Ao aumentar, novos dias consecutivos são criados como novas partes. Ao diminuir, o prazo é encurtado removendo as partes finais que não foram iniciadas.
              </div>
            </div>
          )}
        </div>

        {/* Footer: Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 tutorial-glow-btn flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
