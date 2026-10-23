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
import { TaskCard, BoardList, CustomLabel, TagColorItem } from '../types';
import {
  LABEL_CONFIG,
  resolveLabelInfo,
  toggleLabelSelection,
  sanitizeCardLabels,
} from '../data/initialData';
import {
  getLiveElapsedSeconds,
  formatStopwatch,
  resolveSyncedListIdForDate,
  getTodayIsoDate,
  syncEndTimeWithStart,
  clampEndTime,
} from '../utils/timeUtils';
import { TimeInput24h } from './TimeInput24h';
import { getUserInitials, getUserAvatarGradient } from '../lib/neonAuth';
import { EditRecurrenceModal } from './EditRecurrenceModal';

interface CardModalProps {
  card: TaskCard;
  nowMs: number;
  lists: BoardList[];
  customLabels?: CustomLabel[];
  tagColors?: TagColorItem[];
  onClose: () => void;
  onUpdateCard: (updated: TaskCard) => void;
  onToggleTimer: (e: React.MouseEvent | null, cardId: string) => void;
  onResetTimer: (cardId: string) => void;
  onCompleteCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteRecurringGroup?: (groupId: string) => void;
  onCreateLabel?: (name: string, color: string) => void;
  onDeleteLabel?: (labelId: string) => void;
  onAddTagColor?: (hex: string, name?: string) => void;
  onDeleteTagColor?: (colorId: string) => void;
  onResetTagColors?: () => void;
  onResetCustomLabels?: () => void;
  onAddDayToTask?: (cardId: string) => void;
  onUpdateRecurrenceGroup?: (
    cardId: string,
    payload: {
      mode: 'weekdays' | 'specific_days' | 'days_count';
      weekdays?: number[];
      specificDays?: number[];
      daysCount?: number;
    }
  ) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  nowMs,
  lists,
  customLabels = [],
  tagColors = [],
  onClose,
  onUpdateCard,
  onToggleTimer,
  onResetTimer,
  onCompleteCard,
  onDeleteCard,
  onDeleteRecurringGroup,
  onCreateLabel,
  onDeleteLabel,
  onAddTagColor,
  onDeleteTagColor,
  onResetTagColors,
  onResetCustomLabels,
  onAddDayToTask,
  onUpdateRecurrenceGroup,
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [categoryTag, setCategoryTag] = useState(card.categoryTag || '');
  const [selectedTagColor, setSelectedTagColor] = useState<string>(
    card.tagColor || '#a855f7'
  );
  const [startTime, setStartTime] = useState(card.startTime || '09:00');
  const [endTime, setEndTime] = useState(card.endTime || '10:00');
  const [scheduledDate, setScheduledDate] = useState(
    card.scheduledDate || getTodayIsoDate()
  );
  const [newCheckText, setNewCheckText] = useState('');
  const [isEditRecurrenceOpen, setIsEditRecurrenceOpen] = useState(false);

  // UI state for creating label and adding color
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [showAddColor, setShowAddColor] = useState(false);
  const [newCustomColor, setNewCustomColor] = useState('#06b6d4');

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

  const toggleLabel = (labelKey: string) => {
    const nextLabels = toggleLabelSelection(card.labels, labelKey, customLabels);
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
                  {card.recurrence.mode === 'days_count' || card.recurrence.mode === 'specific_days'
                    ? `Parte ${card.recurrence.dayIndex || 1} de ${card.recurrence.daysCount || 1}`
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

          {/* Criador & Categoria */}
          <div className="p-3.5 rounded-xl bg-[#140d26] border border-purple-500/20 space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Criador da Tarefa</span>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const avatarStyle = getUserAvatarGradient(card.assignee);
                  const initials = getUserInitials(card.assignee);
                  return (
                    <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 w-full">
                      <div className={`w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shadow-sm shadow-black/40 border ${avatarStyle.bg} ${avatarStyle.border}`}>
                        {initials}
                      </div>
                      <span>Criado por: <strong className="text-white">{card.assignee || 'Você'}</strong></span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Tag (Ex: EDIÇÃO)</label>
                  <button
                    type="button"
                    onClick={() => setShowAddColor(!showAddColor)}
                    className="text-[9px] text-cyan-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Nova Cor</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={categoryTag}
                  onChange={(e) => setCategoryTag(e.target.value.toUpperCase())}
                  onBlur={() => saveField({ categoryTag: categoryTag.trim() })}
                  placeholder="EX: PROSPECÇÃO"
                  className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-fuchsia-400"
                  style={selectedTagColor ? { color: selectedTagColor, borderColor: `${selectedTagColor}80` } : undefined}
                />

                {/* Cores das Tags diretamente abaixo do input da Tag */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {tagColors.map((tc) => (
                    <div key={tc.id} className="relative group/col">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTagColor(tc.hex);
                          saveField({ tagColor: tc.hex });
                        }}
                        className={`w-4 h-4 rounded-full cursor-pointer transition-all ${
                          selectedTagColor === tc.hex
                            ? 'ring-2 ring-white scale-125'
                            : 'opacity-55 hover:opacity-100 hover:scale-110'
                        }`}
                        style={{ backgroundColor: tc.hex }}
                        title={`${tc.name} (${tc.hex})`}
                      />
                      {onDeleteTagColor && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTagColor(tc.id);
                            if (selectedTagColor === tc.hex) {
                              setSelectedTagColor('');
                              saveField({ tagColor: undefined });
                            }
                          }}
                          title={`Remover cor ${tc.name}`}
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-all cursor-pointer shadow-sm z-10"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {onResetTagColors && tagColors.length < 5 && (
                    <button
                      type="button"
                      onClick={onResetTagColors}
                      className="text-[9px] text-slate-500 hover:text-cyan-300 transition-colors ml-auto underline cursor-pointer"
                      title="Restaurar paleta padrão de cores"
                    >
                      Restaurar cores
                    </button>
                  )}
                </div>

                {showAddColor && (
                  <div className="flex items-center gap-1.5 p-1.5 mt-2 bg-[#090612] rounded-lg border border-cyan-400/30">
                    <input
                      type="color"
                      value={newCustomColor}
                      onChange={(e) => setNewCustomColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={newCustomColor}
                      onChange={(e) => setNewCustomColor(e.target.value)}
                      className="w-20 bg-black/40 text-[10px] font-mono px-1.5 py-0.5 rounded text-white border border-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (onAddTagColor) onAddTagColor(newCustomColor);
                        setSelectedTagColor(newCustomColor);
                        saveField({ tagColor: newCustomColor });
                        setShowAddColor(false);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/30 text-cyan-200 rounded border border-cyan-400/40 cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                )}
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

                <button
                  type="button"
                  onClick={() => setIsEditRecurrenceOpen(true)}
                  className="mt-2 w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-cyan-300"
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Editar / Adicionar dia</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Etiquetas de Cor / Prioridades */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Etiquetas (Labels / Prioridades)</span>
            </div>
            <div className="flex items-center gap-2">
              {onResetCustomLabels && customLabels.length < 3 && (
                <button
                  type="button"
                  onClick={onResetCustomLabels}
                  className="text-[10px] text-slate-500 hover:text-cyan-300 font-medium transition-colors underline cursor-pointer mr-1"
                  title="Restaurar etiquetas padrão"
                >
                  Restaurar padrões
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCreateLabel(!showCreateLabel)}
                className="text-[10px] text-cyan-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nova Label</span>
              </button>
            </div>
          </div>

          {showCreateLabel && (
            <div className="p-3 mb-3 bg-[#110926] rounded-xl border border-cyan-400/40 space-y-2">
              <span className="text-xs font-bold text-white">Criar Nova Etiqueta</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome da etiqueta..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1 bg-black/40 border border-purple-500/40 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newLabelName.trim() && onCreateLabel) {
                      onCreateLabel(newLabelName.trim(), newLabelColor);
                      setNewLabelName('');
                      setShowCreateLabel(false);
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {customLabels.map((lbl) => {
              const selected = sanitizeCardLabels(card.labels, customLabels).includes(lbl.id);
              return (
                <div key={lbl.id} className="relative group/lbl inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => toggleLabel(lbl.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selected
                        ? 'border-cyan-400 text-white ring-1 ring-cyan-400/50 bg-cyan-950/40'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lbl.color }}
                    />
                    <span>{lbl.name}</span>
                  </button>
                  {onDeleteLabel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLabel(lbl.id);
                      }}
                      title="Excluir etiqueta"
                      className="ml-1 p-1 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 transition-colors opacity-0 group-hover/lbl:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onDeleteCard(card.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 hover:border-rose-500/50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {card.recurrence?.groupId
                  ? 'Excluir Tarefa (e repetições)'
                  : 'Excluir Tarefa'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity cursor-pointer"
          >
            Salvar e Fechar
          </button>
        </div>

        {/* Modal Contextual: Editar / Adicionar Dia */}
        {isEditRecurrenceOpen && (
          <EditRecurrenceModal
            isOpen={isEditRecurrenceOpen}
            card={card}
            onClose={() => setIsEditRecurrenceOpen(false)}
            onSave={(payload) => {
              if (onUpdateRecurrenceGroup) {
                onUpdateRecurrenceGroup(card.id, payload);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
