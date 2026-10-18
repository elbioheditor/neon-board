import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Timer,
  LayoutGrid,
  Repeat,
} from 'lucide-react';
import {
  Board,
  BoardList,
  LabelColor,
  RecurrenceConfig,
  TaskCard,
} from '../types';
import { LABEL_CONFIG } from '../data/initialData';
import {
  getBrasiliaNow,
  getTodayIsoDate,
  compareCardsByTimeOfDay,
  getLiveElapsedSeconds,
  formatStopwatch,
  resolveSyncedListIdForDate,
  syncEndTimeWithStart,
  clampEndTime,
  getDayPeriodKey,
  PERIOD_ZONE_STYLES,
} from '../utils/timeUtils';
import { TimeInput24h } from './TimeInput24h';
import {
  DEFAULT_RECURRENCE_CONFIG,
  RecurrenceButton,
  RecurrencePanel,
} from './RecurrenceControl';

interface CalendarViewProps {
  board: Board;
  lists: BoardList[];
  cards: TaskCard[];
  nowMs: number;
  onOpenModal: (card: TaskCard) => void;
  onToggleTimer: (e: React.MouseEvent, cardId: string) => void;
  onCompleteCard: (e: React.MouseEvent, cardId: string) => void;
  onAddCardForDate: (
    title: string,
    scheduledDate: string,
    startTime: string,
    endTime: string,
    label: LabelColor,
    categoryTag: string,
    recurrence?: RecurrenceConfig
  ) => void;
  onCardDragStart?: (e: React.DragEvent, cardId: string) => void;
  onCardDragEnd?: () => void;
  onMoveCardToDate?: (cardId: string, targetIsoDate: string) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const SHORT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  lists,
  cards,
  nowMs,
  onOpenModal,
  onToggleTimer,
  onCompleteCard,
  onAddCardForDate,
  onCardDragStart,
  onCardDragEnd,
  onMoveCardToDate,
}) => {
  const todayIso = getTodayIsoDate();
  const initialDate = getBrasiliaNow();

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0..11
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [dragOverCellIso, setDragOverCellIso] = useState<string | null>(null);

  // Quick Add Task State for the selected day
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newLabel, setNewLabel] = useState<LabelColor>('purple');
  const [newTag, setNewTag] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceConfig>(
    DEFAULT_RECURRENCE_CONFIG
  );

  const handleStartChange = (val: string) => {
    setNewStart(val);
    setNewEnd((prevEnd) => syncEndTimeWithStart(val, prevEnd));
  };

  const handleEndChange = (val: string) => {
    setNewEnd(clampEndTime(newStart, val));
  };

  // Map cards by scheduledDate (sorted morning -> night)
  const cardsByDate = useMemo(() => {
    const map: Record<string, TaskCard[]> = {};
    cards.forEach((c) => {
      const dateKey = c.scheduledDate || todayIso;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(c);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort(compareCardsByTimeOfDay);
    });
    return map;
  }, [cards, todayIso]);

  // Build calendar cells for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: {
      iso: string | null;
      dayNumber: number | null;
    }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ iso: null, dayNumber: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        iso: `${viewYear}-${mStr}-${dStr}`,
        dayNumber: d,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const selectedDayCards = useMemo(
    () => cardsByDate[selectedDateIso] || [],
    [cardsByDate, selectedDateIso]
  );

  // Determine which Board List this selectedDateIso automatically maps to
  const syncedList = useMemo(() => {
    const listId = resolveSyncedListIdForDate(selectedDateIso, lists);
    return lists.find((l) => l.id === listId) || lists[0];
  }, [selectedDateIso, lists]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = getBrasiliaNow();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateIso(getTodayIsoDate());
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddCardForDate(
      newTitle.trim(),
      selectedDateIso,
      newStart,
      newEnd,
      newLabel,
      newTag,
      newRecurrence
    );
    setNewTitle('');
    setNewRecurrence(DEFAULT_RECURRENCE_CONFIG);
  };

  const formatSelectedDateFull = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full overflow-y-auto px-6 pt-4 pb-28 bg-gradient-to-r from-purple-950/35 via-[#0b0618]/80 to-pink-950/35">
      <div className="max-w-7xl mx-auto">
        {/* Top Month Navigation Bar with Purple (Left) -> Pink (Right) Gradient */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-900/55 via-purple-950/85 to-pink-600/45 border border-pink-500/35 p-4 mb-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600/35 to-pink-500/35 border border-pink-400/40">
                <CalendarIcon className="w-5 h-5 text-pink-200" />
              </div>
              <h2 className="text-xl font-bold font-display text-white">
                {MONTH_NAMES[viewMonth]} de {viewYear}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-500/30 hover:from-purple-600/50 hover:to-pink-500/50 text-pink-200 border border-pink-400/35 text-xs font-bold transition-all cursor-pointer"
              >
                Ir para Hoje
              </button>

              <div className="flex items-center gap-1 bg-[#090612]/90 p-1 rounded-xl border border-pink-500/30">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-bold text-white">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 12 Months Quick Bar */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2 border-t border-white/10">
            {SHORT_MONTHS.map((mName, idx) => {
              const isCurrentMonth = idx === viewMonth;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => setViewMonth(idx)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrentMonth
                      ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-md shadow-pink-500/30'
                      : 'bg-[#090612]/70 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: Monthly Calendar Grid */}
          <div className="lg:col-span-7 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#0e091d]/95 to-pink-950/45 border border-purple-500/35 p-4 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.iso || !cell.dayNumber) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.03]"
                  />
                );
              }

              const isToday = cell.iso === todayIso;
              const isSelected = cell.iso === selectedDateIso;
              const dayTasks = cardsByDate[cell.iso] || [];
              const hasActiveTimer = dayTasks.some(
                (t) => t.status === 'in_progress'
              );

              return (
                <div
                  key={cell.iso}
                  onClick={() => setSelectedDateIso(cell.iso!)}
                  onDragOver={(e) => {
                    if (cell.iso) {
                      e.preventDefault();
                      if (dragOverCellIso !== cell.iso) {
                        setDragOverCellIso(cell.iso);
                      }
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverCellIso === cell.iso) {
                      setDragOverCellIso(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCellIso(null);
                    const rawData = e.dataTransfer.getData('text/plain') || '';
                    const cardId = rawData.startsWith('card:')
                      ? rawData.replace('card:', '')
                      : '';
                    if (cardId && cell.iso && onMoveCardToDate) {
                      onMoveCardToDate(cardId, cell.iso);
                    }
                    if (onCardDragEnd) {
                      onCardDragEnd();
                    }
                  }}
                  className={`h-24 rounded-xl p-2 flex flex-col justify-between cursor-pointer transition-all border overflow-hidden ${
                    dragOverCellIso === cell.iso
                      ? 'bg-[#1f1545] border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-400/40 scale-[1.02]'
                      : isSelected
                      ? 'bg-[#1b1236] border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/15'
                      : isToday
                      ? 'bg-[#160f2c] border-fuchsia-500/60 hover:border-cyan-400/60'
                      : 'bg-[#110b22]/80 border-white/10 hover:border-purple-400/50 hover:bg-[#160f29]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isToday
                          ? 'px-1.5 py-0.5 rounded-md bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white'
                          : isSelected
                          ? 'text-cyan-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayTasks.length > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          hasActiveTimer
                            ? 'bg-cyan-500/30 text-cyan-200 animate-pulse'
                            : 'bg-purple-500/25 text-purple-200'
                        }`}
                      >
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('text/plain', `card:${t.id}`);
                          if (onCardDragStart) onCardDragStart(e, t.id);
                        }}
                        onDragEnd={() => {
                          if (onCardDragEnd) onCardDragEnd();
                        }}
                        className="flex items-center gap-1 text-[10px] truncate px-1.5 py-0.5 rounded bg-[#090612]/90 text-slate-200 border border-white/5 cursor-grab active:cursor-grabbing hover:border-cyan-400/40 transition-colors"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            LABEL_CONFIG[t.labels[0] || 'purple']?.bg
                          }`}
                        />
                        {t.startTime && (
                          <span className="text-cyan-300 font-mono text-[9px]">
                            {t.startTime}
                          </span>
                        )}
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-cyan-300 font-semibold pl-1">
                        + {dayTasks.length - 2} mais...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Selected Day Details + Synchronized Task Creator */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-r from-purple-950/65 via-[#120924]/95 to-pink-950/55 border border-pink-500/35 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-2 pb-3 mb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold font-display text-white capitalize">
                {formatSelectedDateFull(selectedDateIso)}
              </h3>
            </div>

            {syncedList && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-500/30 border border-pink-400/35 text-pink-200 text-[11px] font-bold">
                <LayoutGrid className="w-3.5 h-3.5 text-pink-300" />
                <span>Board: {syncedList.title}</span>
              </div>
            )}
          </div>

          <form
            onSubmit={handleCreateTask}
            className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/70 to-pink-950/50 border border-pink-500/30 space-y-2.5 mb-5"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Criar os Banners, Editar vídeo..."
              className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <TimeInput24h value={newStart} onChange={handleStartChange} />
                <span className="text-[10px] text-slate-400">até</span>
                <TimeInput24h value={newEnd} onChange={handleEndChange} />
              </div>

              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                placeholder="TAG"
                className="w-24 bg-[#090612] border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-xs text-pink-300 font-bold uppercase focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  {(
                    ['purple', 'cyan', 'pink', 'green', 'yellow', 'orange'] as LabelColor[]
                  ).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewLabel(col)}
                      className={`w-4 h-4 rounded-full cursor-pointer ${LABEL_CONFIG[col].bg} ${
                        newLabel === col
                          ? 'ring-2 ring-white scale-110'
                          : 'opacity-45 hover:opacity-85'
                      }`}
                    />
                  ))}
                </div>

                <RecurrenceButton
                  config={newRecurrence}
                  onChange={setNewRecurrence}
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-pink-500/25 hover:opacity-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            <RecurrencePanel
              config={newRecurrence}
              onChange={setNewRecurrence}
            />
          </form>

          {/* List of Tasks on the Selected Day */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {selectedDayCards.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-white/10 text-xs text-slate-400">
                Nenhuma tarefa agendada para este dia ainda.
              </div>
            ) : (
              selectedDayCards.map((card) => {
                const isInProgress = card.status === 'in_progress';
                const isPaused = card.status === 'paused';
                const liveSecs = getLiveElapsedSeconds(card, nowMs);
                const periodKey = getDayPeriodKey(card.startTime);
                const periodStyle = PERIOD_ZONE_STYLES[periodKey];

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', `card:${card.id}`);
                      if (onCardDragStart) onCardDragStart(e, card.id);
                    }}
                    onDragEnd={() => {
                      if (onCardDragEnd) onCardDragEnd();
                    }}
                    onClick={() => onOpenModal(card)}
                    className={`p-3.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                      periodStyle.cardBgClass
                    } ${isInProgress ? 'neon-card-active' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => onCompleteCard(e, card.id)}
                          title="Finalizar Tarefa"
                          className="w-5 h-5 rounded-full border-2 border-white/40 hover:border-pink-300 flex items-center justify-center cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-pink-200" />
                        </button>
                        <span className="text-sm font-semibold text-white">
                          {card.title}
                        </span>
                      </div>

                      {card.recurrence && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/35 text-[10px] font-bold text-cyan-200 flex-shrink-0">
                          <Repeat className="w-2.5 h-2.5 text-cyan-300" />
                          {card.recurrence.mode === 'days_count'
                            ? `Dia ${card.recurrence.dayIndex}/${card.recurrence.daysCount}`
                            : 'Rotina'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[11px] ${periodStyle.timeBadgeClass}`}
                        >
                          <Clock className="w-3 h-3" />
                          {card.startTime || '--:--'}
                          {card.endTime ? ` - ${card.endTime}` : ''}
                        </span>

                        {(liveSecs > 0 || isInProgress || isPaused) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] font-bold">
                            <Timer className="w-3 h-3 text-cyan-400" />
                            {formatStopwatch(liveSecs)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => onToggleTimer(e, card.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                          isInProgress
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950'
                            : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                        }`}
                      >
                        {isInProgress ? (
                          <>
                            <Pause className="w-2.5 h-2.5 fill-current" />
                            <span>PAUSAR</span>
                          </>
                        ) : isPaused || liveSecs > 0 ? (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>RETOMAR</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>INICIAR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
