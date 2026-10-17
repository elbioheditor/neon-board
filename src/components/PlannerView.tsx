import React, { useState } from 'react';
import {
  Clock,
  Sunrise,
  Sun,
  Moon,
  Plus,
  CheckCircle2,
  Play,
  Pause,
  Timer,
} from 'lucide-react';
import { TaskCard, Board, BoardList, LabelColor } from '../types';
import { LABEL_CONFIG } from '../data/initialData';
import {
  getLiveElapsedSeconds,
  formatStopwatch,
  compareCardsByTimeOfDay,
  formatShortDatePt,
  syncEndTimeWithStart,
  clampEndTime,
} from '../utils/timeUtils';
import { TimeInput24h } from './TimeInput24h';

interface PlannerViewProps {
  board: Board;
  lists: BoardList[];
  cards: TaskCard[];
  nowMs: number;
  onOpenModal: (card: TaskCard) => void;
  onToggleTimer: (e: React.MouseEvent, cardId: string) => void;
  onCompleteCard: (e: React.MouseEvent, cardId: string) => void;
  onQuickAddScheduled: (
    title: string,
    startTime: string,
    endTime: string,
    label: LabelColor,
    categoryTag: string
  ) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  lists,
  cards,
  nowMs,
  onOpenModal,
  onToggleTimer,
  onCompleteCard,
  onQuickAddScheduled,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedLabel, setSelectedLabel] = useState<LabelColor>('cyan');
  const [categoryTag, setCategoryTag] = useState('');
  const [filterListId, setFilterListId] = useState<string>('all');

  const handleStartChange = (val: string) => {
    setStartTime(val);
    setEndTime((prevEnd) => syncEndTimeWithStart(val, prevEnd));
  };

  const handleEndChange = (val: string) => {
    setEndTime(clampEndTime(startTime, val));
  };

  const filteredCards = cards
    .filter((c) => (filterListId === 'all' ? true : c.listId === filterListId))
    .sort(compareCardsByTimeOfDay);

  const getHour = (t?: string) => {
    if (!t) return null;
    const h = parseInt(t.split(':')[0], 10);
    return isNaN(h) ? null : h;
  };

  const morningCards = filteredCards.filter((c) => {
    const h = getHour(c.startTime);
    return h !== null && h >= 5 && h < 12;
  });

  const afternoonCards = filteredCards.filter((c) => {
    const h = getHour(c.startTime);
    return h !== null && h >= 12 && h < 18;
  });

  const nightCards = filteredCards.filter((c) => {
    const h = getHour(c.startTime);
    return h !== null && (h >= 18 || h < 5);
  });

  const unscheduledCards = filteredCards.filter((c) => getHour(c.startTime) === null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onQuickAddScheduled(title.trim(), startTime, endTime, selectedLabel, categoryTag);
    setTitle('');
  };

  const renderTimelineBlock = (
    blockTitle: string,
    icon: React.ReactNode,
    blockCards: TaskCard[]
  ) => (
    <div className="rounded-2xl bg-[#16181e] border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700">
            {icon}
          </div>
          <h3 className="text-sm font-bold font-display text-white">{blockTitle}</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
          {blockCards.length}
        </span>
      </div>

      {blockCards.length === 0 ? (
        <div className="py-5 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          Sem tarefas neste período.
        </div>
      ) : (
        <div className="space-y-2">
          {blockCards.map((card) => {
            const isInProgress = card.status === 'in_progress';
            const isPaused = card.status === 'paused';
            const liveSecs = getLiveElapsedSeconds(card, nowMs);
            const listObj = lists.find((l) => l.id === card.listId);
            return (
              <div
                key={card.id}
                onClick={() => onOpenModal(card)}
                className={`group flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isInProgress
                    ? 'bg-[#20232b] border-zinc-400 neon-card-active'
                    : 'bg-[#1a1c22] border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* Left: Time Column + Complete Check */}
                <div className="flex items-center gap-3 min-w-[135px]">
                  <button
                    type="button"
                    onClick={(e) => onCompleteCard(e, card.id)}
                    title="Finalizar Tarefa"
                    className="w-4 h-4 rounded-full border border-zinc-500 hover:border-zinc-200 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-zinc-200 opacity-0 group-hover:opacity-100" />
                  </button>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono font-semibold">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>
                      {card.startTime || '--:--'}
                      {card.endTime ? ` - ${card.endTime}` : ''}
                    </span>
                  </div>
                </div>

                {/* Middle: Title & Labels */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-100">{card.title}</span>
                    {card.categoryTag && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {card.categoryTag}
                      </span>
                    )}
                    {listObj && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {listObj.title}
                      </span>
                    )}
                    {card.scheduledDate && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {formatShortDatePt(card.scheduledDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Live Stopwatch & Start/Pause/Resume */}
                <div className="flex items-center gap-2.5">
                  {(liveSecs > 0 || isInProgress || isPaused) && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-xs font-semibold text-zinc-200">
                      <Timer
                        className={`w-3.5 h-3.5 ${
                          isInProgress ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                        }`}
                      />
                      <span>{formatStopwatch(liveSecs)}</span>
                    </div>
                  )}

                  <div className="flex gap-1">
                    {card.labels.map((c) => (
                      <span
                        key={c}
                        className={`w-2 h-2 rounded-full ${LABEL_CONFIG[c]?.bg}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => onToggleTimer(e, card.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                      isInProgress
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : isPaused || liveSecs > 0
                        ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {isInProgress ? (
                      <>
                        <Pause className="w-3 h-3 fill-current" />
                        <span>Pausar</span>
                      </>
                    ) : isPaused || liveSecs > 0 ? (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Retomar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Iniciar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto px-6 pt-4 pb-28 max-w-6xl mx-auto">
      {/* Header & Quick Time-Block Creator */}
      <div className="rounded-2xl bg-[#16181e] border border-zinc-800 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold font-display text-white">Planner</h2>

          {/* Filter by List */}
          <div className="flex items-center gap-1 bg-[#121317] p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setFilterListId('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterListId === 'all'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setFilterListId(l.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterListId === l.id
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {l.title}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Add Form with 24h Hours */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-center gap-2.5 bg-[#121317] p-3 rounded-xl border border-zinc-800"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Adicionar tarefa com horário..."
            className="flex-1 min-w-[220px] bg-[#181a20] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />

          <div className="flex items-center gap-1.5">
            <TimeInput24h value={startTime} onChange={handleStartChange} />
            <span className="text-zinc-500 text-xs">até</span>
            <TimeInput24h value={endTime} onChange={handleEndChange} />
          </div>

          <input
            type="text"
            value={categoryTag}
            onChange={(e) => setCategoryTag(e.target.value.toUpperCase())}
            placeholder="TAG"
            className="w-24 bg-[#181a20] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-semibold uppercase focus:outline-none"
          />

          <div className="flex items-center gap-1">
            {(['purple', 'cyan', 'pink', 'orange'] as LabelColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedLabel(c)}
                className={`w-3.5 h-3.5 rounded-full ${LABEL_CONFIG[c].bg} ${
                  selectedLabel === c ? 'ring-2 ring-white scale-110' : 'opacity-45'
                }`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </form>
      </div>

      {/* Timeline Sections */}
      <div className="space-y-4">
        {renderTimelineBlock(
          'Manhã (05:00 – 11:59)',
          <Sunrise className="w-4 h-4 text-zinc-300" />,
          morningCards
        )}

        {renderTimelineBlock(
          'Tarde (12:00 – 17:59)',
          <Sun className="w-4 h-4 text-zinc-300" />,
          afternoonCards
        )}

        {renderTimelineBlock(
          'Noite (18:00 – 23:59)',
          <Moon className="w-4 h-4 text-zinc-300" />,
          nightCards
        )}

        {unscheduledCards.length > 0 &&
          renderTimelineBlock(
            'Sem Horário Definido',
            <Clock className="w-4 h-4 text-zinc-300" />,
            unscheduledCards
          )}
      </div>
    </div>
  );
};
