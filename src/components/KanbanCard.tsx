import React from 'react';
import {
  Clock,
  CheckSquare,
  AlignLeft,
  Play,
  Pause,
  CheckCircle2,
  Timer,
  Calendar,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import { TaskCard, CustomLabel } from '../types';
import { resolveLabelInfo } from '../data/initialData';
import {
  getLiveElapsedSeconds,
  formatStopwatch,
  formatShortDatePt,
  getDayPeriodKey,
  PERIOD_ZONE_STYLES,
} from '../utils/timeUtils';

interface KanbanCardProps {
  card: TaskCard;
  nowMs: number;
  customLabels?: CustomLabel[];
  isTodayList?: boolean;
  isRecentlyTransferred?: boolean;
  onOpenModal: (card: TaskCard) => void;
  onToggleTimer: (e: React.MouseEvent, cardId: string) => void;
  onResetTimer?: (cardId: string) => void;
  onCompleteCard: (e: React.MouseEvent, cardId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragEnd?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  nowMs,
  customLabels,
  isTodayList = false,
  isRecentlyTransferred = false,
  onOpenModal,
  onToggleTimer,
  onResetTimer,
  onCompleteCard,
  onDragStart,
  onDragEnd,
}) => {
  const isInProgress = card.status === 'in_progress';
  const isPaused = card.status === 'paused';
  const totalCheck = card.checklist.length;
  const doneCheck = card.checklist.filter((c) => c.completed).length;

  const liveSeconds = getLiveElapsedSeconds(card, nowMs);
  const hasTrackedTime = liveSeconds > 0 || isInProgress || isPaused;

  const periodKey = getDayPeriodKey(card.startTime);
  const periodStyle = PERIOD_ZONE_STYLES[periodKey];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, card.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpenModal(card)}
      className={`group relative rounded-xl p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none border ${
        periodStyle.cardBgClass
      } ${
        isInProgress
          ? 'ring-1 ring-cyan-400/80 neon-card-active'
          : 'hover:-translate-y-0.5'
      } ${isRecentlyTransferred ? 'animate-slot-in ring-2 ring-cyan-300' : ''}`}
    >
      {/* Top Labels (Prioridades/Custom) + Category Tag with TagColor */}
      {(card.labels.length > 0 || card.categoryTag) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {card.labels.map((lblKey) => {
            const info = resolveLabelInfo(lblKey, customLabels);
            return (
              <span
                key={lblKey}
                className={`h-4 px-2 rounded-full text-[9px] font-extrabold uppercase tracking-tight inline-flex items-center justify-center shadow-sm text-white ${
                  info.isHex ? '' : info.bgClass || 'bg-blue-500'
                }`}
                style={
                  info.isHex
                    ? { backgroundColor: info.color, color: '#ffffff' }
                    : undefined
                }
                title={info.name}
              >
                {info.name}
              </span>
            );
          })}

          {card.categoryTag && (
            <span
              style={
                card.tagColor
                  ? {
                      backgroundColor: `${card.tagColor}22`,
                      borderColor: `${card.tagColor}60`,
                      color: card.tagColor,
                      boxShadow: `0 0 10px ${card.tagColor}25`,
                    }
                  : undefined
              }
              className={
                card.tagColor
                  ? 'ml-auto text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border'
                  : 'ml-auto text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/35'
              }
            >
              {card.categoryTag}
            </span>
          )}
        </div>
      )}

      {/* Title Row + Quick Complete Button */}
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={(e) => onCompleteCard(e, card.id)}
          title="Finalizar Tarefa (Para o cronômetro e move para Dale)"
          className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-white/40 hover:border-cyan-300 hover:bg-cyan-400/25 flex items-center justify-center transition-all group/check cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200 opacity-0 group-hover/check:opacity-100 transition-opacity" />
        </button>

        <h4 className="text-sm font-medium text-white leading-snug flex-1 break-words">
          {card.title}
        </h4>
      </div>

      {/* Live Stopwatch Bar with quick Reset button */}
      {hasTrackedTime && (
        <div
          className={`mt-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
            isInProgress
              ? 'bg-cyan-950/75 border-cyan-400/60 text-cyan-200'
              : 'bg-amber-950/55 border-amber-400/45 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Timer
              className={`w-3.5 h-3.5 ${
                isInProgress ? 'text-cyan-400 animate-pulse' : 'text-amber-400'
              }`}
            />
            <span>{formatStopwatch(liveSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/35">
              {isInProgress ? 'Cronometrando...' : 'Pausado'}
            </span>
            {onResetTimer && (liveSeconds > 0 || isPaused || isInProgress) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetTimer(card.id);
                }}
                title="Zerar cronômetro da tarefa"
                className="p-1 rounded bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Schedule / Time Slot + Stopwatch Action Button */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Time Badge (24h) */}
          {(card.startTime || card.endTime) && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${periodStyle.timeBadgeClass}`}
            >
              <Clock className="w-3 h-3 opacity-80" />
              <span>
                {card.startTime || '--:--'}
                {card.endTime ? ` - ${card.endTime}` : ''}
              </span>
            </div>
          )}

          {/* Date Badge (Only shown when not in Today list) */}
          {!isTodayList && card.scheduledDate && (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/35 text-purple-200 border border-purple-400/30">
              <Calendar className="w-2.5 h-2.5 text-fuchsia-400" />
              <span>{formatShortDatePt(card.scheduledDate)}</span>
            </div>
          )}

          {/* Recurrence Badge (Rotina or Dia X/Y) */}
          {card.recurrence && (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/35">
              <Repeat className="w-2.5 h-2.5 text-cyan-300" />
              <span>
                {card.recurrence.mode === 'days_count'
                  ? `Dia ${card.recurrence.dayIndex}/${card.recurrence.daysCount}`
                  : card.recurrence.mode === 'specific_days'
                  ? 'Específico'
                  : 'Rotina'}
              </span>
            </div>
          )}

          {/* Description Indicator */}
          {card.description && (
            <span
              title="Possui descrição"
              className="inline-flex items-center text-slate-300/80 px-1 py-0.5"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Checklist Indicator */}
          {totalCheck > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                doneCheck === totalCheck
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                  : 'bg-black/30 text-slate-200 border border-white/10'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              {doneCheck}/{totalCheck}
            </span>
          )}
        </div>

        {/* Right Side: Start / Pause / Resume Button + Reset Button + Owner Avatar */}
        <div className="flex items-center gap-1.5 ml-auto">
          {onResetTimer && (liveSeconds > 0 || isPaused || isInProgress) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetTimer(card.id);
              }}
              title="Zerar cronômetro"
              className="p-1 rounded-full bg-white/5 hover:bg-rose-500/25 text-slate-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => onToggleTimer(e, card.id)}
            title={
              isInProgress
                ? 'Pausar cronômetro da tarefa'
                : isPaused || liveSeconds > 0
                ? 'Despausar / Retomar cronômetro'
                : 'Iniciar cronômetro de edição'
            }
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
              isInProgress
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 hover:opacity-95'
                : isPaused || liveSeconds > 0
                ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-md shadow-cyan-500/25 hover:opacity-95'
                : 'bg-black/35 text-slate-200 hover:bg-purple-500/40 hover:text-white border border-white/20'
            }`}
          >
            {isInProgress ? (
              <>
                <Pause className="w-2.5 h-2.5 fill-current" />
                <span>PAUSAR</span>
              </>
            ) : isPaused || liveSeconds > 0 ? (
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

          {/* Assignee Avatar (Elbioh = EL, Didi = DI) */}
          <div
            title={`Responsável: ${card.assignee}`}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tighter border ${
              card.assignee === 'Elbioh'
                ? 'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white border-fuchsia-400/50 shadow-sm shadow-fuchsia-500/30'
                : 'bg-gradient-to-br from-cyan-500 to-blue-700 text-white border-cyan-300/50 shadow-sm shadow-cyan-500/30'
            }`}
          >
            {card.assignee === 'Elbioh' ? 'EL' : 'DI'}
          </div>
        </div>
      </div>
    </div>
  );
};
