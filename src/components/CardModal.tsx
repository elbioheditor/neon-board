import React, { useState } from 'react';
import {
  X,
  Clock,
  Tag,
  CheckSquare,
  AlignLeft,
  Trash2,
  CheckCircle2,
  UserCheck,
  Plus,
  Calendar,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Repeat,
} from 'lucide-react';
import { TaskCard, LabelColor, BoardList } from '../types';
import { LABEL_CONFIG } from '../data/initialData';
import {
  getLiveElapsedSeconds,
  formatStopwatch,
  resolveSyncedListIdForDate,
  getTodayIsoDate,
  syncEndTimeWithStart,
  clampEndTime,
} from '../utils/timeUtils';
import { TimeInput24h } from './TimeInput24h';

interface CardModalProps {
  card: TaskCard;
  nowMs: number;
  lists: BoardList[];
  onClose: () => void;
  onUpdateCard: (updated: TaskCard) => void;
  onToggleTimer: (e: React.MouseEvent | null, cardId: string) => void;
  onResetTimer: (cardId: string) => void;
  onCompleteCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
}

const ALL_COLORS: LabelColor[] = ['purple', 'cyan', 'pink', 'green', 'yellow', 'orange'];

export const CardModal: React.FC<CardModalProps> = ({
  card,
  nowMs,
  lists,
  onClose,
  onUpdateCard,
  onToggleTimer,
  onResetTimer,
  onCompleteCard,
  onDeleteCard,
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [categoryTag, setCategoryTag] = useState(card.categoryTag || '');
  const [startTime, setStartTime] = useState(card.startTime || '09:00');
  const [endTime, setEndTime] = useState(card.endTime || '10:00');
  const [scheduledDate, setScheduledDate] = useState(
    card.scheduledDate || getTodayIsoDate()
  );
  const [newCheckText, setNewCheckText] = useState('');

  const isInProgress = card.status === 'in_progress';
  const isPaused = card.status === 'paused';
  const liveSeconds = getLiveElapsedSeconds(card, nowMs);

  const saveField = (patch: Partial<TaskCard>) => {
    onUpdateCard({ ...card, ...patch });
  };

  const handleStartTimeChange = (newStart: string) => {
    const syncedEnd = syncEndTimeWithStart(newStart, endTime);
    setStartTime(newStart);
    setEndTime(syncedEnd);
    saveField({ startTime: newStart, endTime: syncedEnd });
  };

  const handleEndTimeChange = (newEnd: string) => {
    const validEnd = clampEndTime(startTime, newEnd);
    setEndTime(validEnd);
    saveField({ endTime: validEnd });
  };

  const handleDateChange = (newDate: string) => {
    setScheduledDate(newDate);
    const syncedListId = resolveSyncedListIdForDate(newDate, lists);
    saveField({
      scheduledDate: newDate,
      listId: syncedListId || card.listId,
    });
  };

  const toggleLabel = (color: LabelColor) => {
    const exists = card.labels.includes(color);
    const nextLabels = exists
      ? card.labels.filter((c) => c !== color)
      : [...card.labels, color];
    saveField({ labels: nextLabels });
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckText.trim()) return;
    const nextList = [
      ...card.checklist,
      {
        id: 'chk-' + Date.now(),
        text: newCheckText.trim(),
        completed: false,
      },
    ];
    setNewCheckText('');
    saveField({ checklist: nextList });
  };

  const toggleChecklistItem = (itemId: string) => {
    const nextList = card.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    saveField({ checklist: nextList });
  };

  const removeChecklistItem = (itemId: string) => {
    const nextList = card.checklist.filter((item) => item.id !== itemId);
    saveField({ checklist: nextList });
  };

  const applyTimePreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    saveField({ startTime: start, endTime: end });
  };

  const totalCheck = card.checklist.length;
  const doneCheck = card.checklist.filter((c) => c.completed).length;
  const progressPct = totalCheck > 0 ? Math.round((doneCheck / totalCheck) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e091c] border border-purple-500/35 shadow-2xl shadow-purple-950/60 p-6 text-slate-100"
      >
        {/* Top Neon Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />

        {/* Header: Title + Close */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveField({ title: title.trim() || 'Sem título' })}
              className="w-full text-xl font-bold font-display bg-transparent border-b border-transparent focus:border-cyan-400 focus:outline-none pb-1 text-white"
              placeholder="Título da tarefa..."
            />
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Coluna no Board:</span>
                <select
                  value={card.listId}
                  onChange={(e) => saveField({ listId: e.target.value })}
                  className="bg-[#191130] text-cyan-300 border border-purple-500/30 rounded-md px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-400"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              {card.recurrence && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-bold text-cyan-200">
                  <Repeat className="w-3 h-3 text-cyan-300" />
                  {card.recurrence.mode === 'days_count'
                    ? `Dia ${card.recurrence.dayIndex} de ${card.recurrence.daysCount}`
                    : 'Tarefa de Rotina'}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CRONÔMETRO DE EDIÇÃO / TAREFA & FINALIZAÇÃO */}
        <div
          className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border mb-5 transition-all ${
            isInProgress
              ? 'bg-[#171130] border-cyan-400/60 shadow-lg shadow-cyan-500/15'
              : 'bg-[#150e2a] border-purple-500/25'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                isInProgress
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : isPaused
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-purple-500/15 border-purple-400/30 text-purple-300'
              }`}
            >
              <Timer className={`w-6 h-6 ${isInProgress ? 'animate-pulse' : ''}`} />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Cronômetro da Tarefa{' '}
                {isInProgress
                  ? '• RODANDO AO VIVO'
                  : isPaused
                  ? '• PAUSADO'
                  : '• PRONTO'}
              </div>
              <div className="text-2xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-purple-300">
                {formatStopwatch(liveSeconds)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleTimer(null, card.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isInProgress
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25'
                  : 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25'
              }`}
            >
              {isInProgress ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pausar Cronômetro</span>
                </>
              ) : isPaused || liveSeconds > 0 ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Despausar / Retomar</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Cronômetro</span>
                </>
              )}
            </button>

            {liveSeconds > 0 && (
              <button
                type="button"
                onClick={() => onResetTimer(card.id)}
                title="Zerar cronômetro"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onCompleteCard(card.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar Tarefa</span>
            </button>
          </div>
        </div>

        {/* Grid: Horários (24h) & Responsável / Tag */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Horário do Dia (24h) */}
          <div className="p-3.5 rounded-xl bg-[#140d26] border border-cyan-500/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Horário (Formato 24h)</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Início</label>
                <TimeInput24h
                  value={startTime}
                  onChange={handleStartTimeChange}
                />
              </div>
              <span className="text-slate-500 text-xs mt-5">até</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fim</label>
                <TimeInput24h
                  value={endTime}
                  onChange={handleEndTimeChange}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '09:00 - 11:00', s: '09:00', e: '11:00' },
                { label: '14:00 - 16:00', s: '14:00', e: '16:00' },
                { label: '19:00 - 21:00', s: '19:00', e: '21:00' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyTimePreset(p.s, p.e)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/20 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsável & Tag & Data Sincronizada */}
          <div className="p-3.5 rounded-xl bg-[#140d26] border border-purple-500/20 space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Responsável & Categoria</span>
              </div>
              <div className="flex items-center gap-2">
                {(['Elbioh', 'Didi'] as const).map((person) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => saveField({ assignee: person })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      card.assignee === person
                        ? person === 'Elbioh'
                          ? 'bg-fuchsia-600/30 border-fuchsia-400 text-fuchsia-200'
                          : 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {person}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tag (Ex: EDIÇÃO)</label>
                <input
                  type="text"
                  value={categoryTag}
                  onChange={(e) => setCategoryTag(e.target.value.toUpperCase())}
                  onBlur={() => saveField({ categoryTag: categoryTag.trim() })}
                  placeholder="EX: PROSPECÇÃO"
                  className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-xs text-fuchsia-300 font-bold uppercase focus:outline-none focus:border-fuchsia-400"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1 text-cyan-400" />
                  Dia (Sincroniza Board)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Etiquetas de Cor (Trello Style) */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <Tag className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Etiquetas (Labels)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_COLORS.map((color) => {
              const selected = card.labels.includes(color);
              const cfg = LABEL_CONFIG[color];
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => toggleLabel(color)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selected
                      ? `${cfg.pillBg} ${cfg.border} ${cfg.text} ring-1 ring-cyan-400/50`
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${cfg.bg}`} />
                  <span>{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Descrição */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <AlignLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Descrição e Notas da Tarefa</span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => saveField({ description })}
            placeholder="Adicione detalhes, links de referência, roteiro ou observações..."
            className="w-full rounded-xl bg-[#090612] border border-purple-500/30 p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
          />
        </div>

        {/* Checklist */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Checklist ({doneCheck}/{totalCheck})</span>
            </div>
            {totalCheck > 0 && (
              <span className="text-xs font-bold text-cyan-300">{progressPct}%</span>
            )}
          </div>

          {totalCheck > 0 && (
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="space-y-1.5 mb-3">
            {card.checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#140e28] border border-white/5"
              >
                <label className="flex items-center gap-2.5 flex-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                  />
                  <span
                    className={
                      item.completed ? 'line-through text-slate-500' : 'text-slate-200'
                    }
                  >
                    {item.text}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddChecklist} className="flex gap-2">
            <input
              type="text"
              value={newCheckText}
              onChange={(e) => setNewCheckText(e.target.value)}
              placeholder="Adicionar sub-tarefa no checklist..."
              className="flex-1 rounded-lg bg-[#090612] border border-purple-500/30 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onDeleteCard(card.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Tarefa</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity cursor-pointer"
          >
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
