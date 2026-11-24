import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Board,
  BoardList,
  ChecklistItem,
  CustomLabel,
  TagColorItem,
  TaskCard,
  WorkProject,
} from '../core/types';
import {
  addMinutesToTime24h,
  formatStopwatch,
  getCurrentTime24h,
  getLiveElapsedSeconds,
  resolveSyncedListIdForDate,
  syncEndTimeWithStart,
  clampEndTime,
} from '../core/timeUtils';
import {
  sanitizeCardLabels,
  toggleLabelSelection,
} from '../core/labelsAndColors';
import { TimeInput24hMobile } from './TimeInput24hMobile';

interface CardDetailSheetProps {
  card: TaskCard | null;
  visible: boolean;
  nowMs: number;
  boards: Board[];
  lists: BoardList[];
  customLabels: CustomLabel[];
  tagColors: TagColorItem[];
  projects?: WorkProject[];
  onClose: () => void;
  onUpdateCard: (updated: TaskCard) => void;
  onAssignProject?: (cardId: string, projectId: string | undefined) => void;
  onMoveCardToDate?: (cardId: string, newDateIso: string) => void;
  onToggleTimer: (cardId: string) => void;
  onResetTimer: (cardId: string) => void;
  onCompleteCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onAddTagColor: (hex: string, name?: string) => void;
  onDeleteTagColor: (colorId: string) => void;
  onResetTagColors: () => void;
  onCreateLabel: (name: string, color: string) => void;
  onDeleteLabel: (labelId: string) => void;
  onResetCustomLabels: () => void;
  onTransferCardToBoard: (cardId: string, targetBoardId: string) => void;
}

const QUICK_PALETTE = [
  '#ec4899',
  '#f97316',
  '#84cc16',
  '#14b8a6',
  '#6366f1',
  '#f43f5e',
  '#38bdf8',
];

export const CardDetailSheet: React.FC<CardDetailSheetProps> = ({
  card,
  visible,
  nowMs,
  boards,
  lists,
  customLabels,
  tagColors,
  projects = [],
  onClose,
  onUpdateCard,
  onAssignProject,
  onMoveCardToDate,
  onToggleTimer,
  onResetTimer,
  onCompleteCard,
  onDeleteCard,
  onAddTagColor,
  onDeleteTagColor,
  onResetTagColors,
  onCreateLabel,
  onDeleteLabel,
  onResetCustomLabels,
  onTransferCardToBoard,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [selectedTagColor, setSelectedTagColor] = useState('#a855f7');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [scheduledDate, setScheduledDate] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorHex, setNewColorHex] = useState('#ec4899');
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  // Add / subtract / set hours & minutes on task stopwatch
  const [isAdjustingTime, setIsAdjustingTime] = useState(false);
  const [adjustHoursInput, setAdjustHoursInput] = useState('');
  const [adjustMinutesInput, setAdjustMinutesInput] = useState('');
  const isSubtractingTime =
    adjustHoursInput.trim().startsWith('-') ||
    adjustMinutesInput.trim().startsWith('-');

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setCategoryTag(card.categoryTag || '');
      setSelectedTagColor(card.tagColor || '#a855f7');
      setStartTime(card.startTime || '09:00');
      setEndTime(card.endTime || '10:00');
      setScheduledDate(card.scheduledDate || '');
    }
  }, [card]);

  if (!card || !visible) return null;

  const liveSeconds = getLiveElapsedSeconds(card, nowMs);
  const isRunning = card.status === 'in_progress';
  const isCompleted = card.status === 'completed';

  const saveField = (partial: Partial<TaskCard>) => {
    onUpdateCard({
      ...card,
      ...partial,
      updatedAt: Date.now(),
    });
  };

  const applyTimeAdjustment = (mode: 'add' | 'set', secondsValue: number) => {
    const currentNow = Date.now();
    const currentElapsed = getLiveElapsedSeconds(card, currentNow);
    const nextElapsed =
      mode === 'add'
        ? Math.max(0, currentElapsed + secondsValue)
        : Math.max(0, secondsValue);

    let nextStatus = card.status;
    if (card.status === 'todo' && nextElapsed > 0) {
      nextStatus = 'paused';
    } else if (card.status === 'paused' && nextElapsed === 0) {
      nextStatus = 'todo';
    }

    onUpdateCard({
      ...card,
      status: nextStatus,
      elapsedSeconds: nextElapsed,
      timerStartedAt: card.status === 'in_progress' ? currentNow : undefined,
      updatedAt: currentNow,
    });
  };

  const handleApplyCustomAddOrSubtract = () => {
    const rawH = adjustHoursInput.trim();
    const rawM = adjustMinutesInput.trim();
    const isNeg = rawH.startsWith('-') || rawM.startsWith('-');
    const absH = Math.abs(parseFloat(rawH.replace(',', '.')) || 0);
    const absM = Math.abs(parseFloat(rawM.replace(',', '.')) || 0);
    const totalSecs = Math.round(absH * 3600 + absM * 60);
    if (totalSecs === 0) return;
    applyTimeAdjustment('add', isNeg ? -totalSecs : totalSecs);
    setAdjustHoursInput('');
    setAdjustMinutesInput('');
    setIsAdjustingTime(false);
  };

  const handleApplyCustomSetTotal = () => {
    const h = Math.max(0, parseFloat(adjustHoursInput.replace(',', '.')) || 0);
    const m = Math.max(0, parseFloat(adjustMinutesInput.replace(',', '.')) || 0);
    const targetSecs = Math.round(h * 3600 + m * 60);
    applyTimeAdjustment('set', targetSecs);
    setAdjustHoursInput('');
    setAdjustMinutesInput('');
    setIsAdjustingTime(false);
  };

  const handleDateChange = (newDate: string) => {
    setScheduledDate(newDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      if (onMoveCardToDate) {
        onMoveCardToDate(card.id, newDate);
      } else {
        const targetListId = resolveSyncedListIdForDate(newDate, lists);
        saveField({
          scheduledDate: newDate,
          listId: targetListId || card.listId,
        });
      }
    }
  };

  const handleAddChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    const item: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newCheckItem.trim(),
      completed: false,
    };
    saveField({ checklist: [...(card.checklist || []), item] });
    setNewCheckItem('');
  };

  const handleToggleCheckItem = (itemId: string) => {
    const next = (card.checklist || []).map((c) =>
      c.id === itemId ? { ...c, completed: !c.completed } : c
    );
    saveField({ checklist: next });
  };

  const handleDeleteCheckItem = (itemId: string) => {
    const next = (card.checklist || []).filter((c) => c.id !== itemId);
    saveField({ checklist: next });
  };

  const doneCount = (card.checklist || []).filter((c) => c.completed).length;
  const totalCount = (card.checklist || []).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.topRow}>
            <Text style={styles.sheetHeader}>DETALHES DA TAREFA</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              onBlur={() => {
                if (title.trim()) saveField({ title: title.trim() });
              }}
              placeholder="Título da tarefa"
              placeholderTextColor="#64748b"
            />

            {/* Stopwatch Box */}
            <View style={[styles.timerBox, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <View>
                  <Text style={styles.timerLabel}>CRONÔMETRO DA TAREFA</Text>
                  <Text
                    style={[
                      styles.timerDigits,
                      isRunning && { color: '#22d3ee' },
                    ]}
                  >
                    {formatStopwatch(liveSeconds)}
                  </Text>
                </View>
                <View style={[styles.timerBtnsRow, { flexWrap: 'wrap' }]}>
                  <Pressable
                    onPress={() => setIsAdjustingTime((v) => !v)}
                    style={{
                      backgroundColor: isAdjustingTime
                        ? 'rgba(34, 211, 238, 0.25)'
                        : 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1,
                      borderColor: '#22d3ee',
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: '#a5f3fc',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      + Horas / Min
                    </Text>
                  </Pressable>

                  {!isCompleted && (
                    <Pressable
                      onPress={() => onToggleTimer(card.id)}
                      style={[
                        styles.timerActionBtn,
                        {
                          backgroundColor: isRunning ? '#f59e0b' : '#22d3ee',
                        },
                      ]}
                    >
                      <Text style={styles.timerActionText}>
                        {isRunning ? '⏸ PAUSAR' : '▶ INICIAR'}
                      </Text>
                    </Pressable>
                  )}
                  {liveSeconds > 0 && (
                    <Pressable
                      onPress={() => onResetTimer(card.id)}
                      style={styles.resetBtn}
                    >
                      <Text style={styles.resetText}>↺</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      onCompleteCard(card.id);
                      onClose();
                    }}
                    style={[
                      styles.completeBtn,
                      isCompleted && { backgroundColor: '#475569' },
                    ]}
                  >
                    <Text style={styles.completeBtnText}>
                      {isCompleted ? '↩ Reabrir' : '✓ Concluir'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {isAdjustingTime && (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.1)',
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      color: '#67e8f9',
                      fontSize: 10.5,
                      fontWeight: '900',
                    }}
                  >
                    ⏱ ESQUECEU DE DESPAUSAR? ADICIONE OU AJUSTE HORAS E MINUTOS:
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: '+15m', secs: 15 * 60 },
                      { label: '+30m', secs: 30 * 60 },
                      { label: '+45m', secs: 45 * 60 },
                      { label: '+1h', secs: 3600 },
                      { label: '+2h', secs: 7200 },
                    ].map((p) => (
                      <Pressable
                        key={p.label}
                        onPress={() => applyTimeAdjustment('add', p.secs)}
                        style={{
                          backgroundColor: 'rgba(34, 211, 238, 0.16)',
                          borderWidth: 1,
                          borderColor: 'rgba(34, 211, 238, 0.45)',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#a5f3fc',
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#07050d',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.45)',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: '700',
                          paddingVertical: 8,
                        }}
                        placeholder="0 (ou -1)"
                        placeholderTextColor="#64748b"
                        value={adjustHoursInput}
                        onChangeText={setAdjustHoursInput}
                        keyboardType="numbers-and-punctuation"
                      />
                      <Text
                        style={{
                          color: '#94a3b8',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        h
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#07050d',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.45)',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                      }}
                    >
                      <TextInput
                        style={{
                          flex: 1,
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: '700',
                          paddingVertical: 8,
                        }}
                        placeholder="30 (ou -15)"
                        placeholderTextColor="#64748b"
                        value={adjustMinutesInput}
                        onChangeText={setAdjustMinutesInput}
                        keyboardType="numbers-and-punctuation"
                      />
                      <Text
                        style={{
                          color: '#94a3b8',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        min
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={handleApplyCustomAddOrSubtract}
                      style={{
                        flex: 1,
                        backgroundColor: isSubtractingTime
                          ? 'rgba(244, 63, 94, 0.25)'
                          : 'rgba(168, 85, 247, 0.3)',
                        borderWidth: 1,
                        borderColor: isSubtractingTime ? '#f43f5e' : '#a855f7',
                        borderRadius: 10,
                        paddingVertical: 9,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#ffffff',
                          fontSize: 11.5,
                          fontWeight: '900',
                        }}
                      >
                        {isSubtractingTime
                          ? '- Subtrair Tempo'
                          : '+ Somar Horas / Min'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleApplyCustomSetTotal}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(34, 211, 238, 0.22)',
                        borderWidth: 1,
                        borderColor: '#22d3ee',
                        borderRadius: 10,
                        paddingVertical: 9,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#e0f2fe',
                          fontSize: 11.5,
                          fontWeight: '900',
                        }}
                      >
                        = Definir Total
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Vincular a Projeto Section */}
            {onAssignProject && (
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>
                  💼 VINCULAR HORAS A UM PROJETO
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 6 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => onAssignProject(card.id, undefined)}
                      style={[
                        styles.labelPill,
                        !card.projectId && {
                          borderColor: '#22d3ee',
                          backgroundColor: 'rgba(34, 211, 238, 0.2)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.labelPillText,
                          !card.projectId && { color: '#ffffff' },
                        ]}
                      >
                        Nenhum
                      </Text>
                    </Pressable>
                    {projects
                      .filter(
                        (p) =>
                          p.status === 'active' || p.id === card.projectId
                      )
                      .map((p) => {
                        const isSelected = card.projectId === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() =>
                              onAssignProject(
                                card.id,
                                isSelected ? undefined : p.id
                              )
                            }
                            style={[
                              styles.labelPill,
                              isSelected && {
                                borderColor: p.color || '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.25)',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.labelDot,
                                { backgroundColor: p.color || '#a855f7' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.labelPillText,
                                isSelected && {
                                  color: '#ffffff',
                                  fontWeight: '900',
                                },
                              ]}
                            >
                              {p.title} ({p.clientName || 'Brody'})
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Time & Date */}
            <View style={styles.row2Col}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Início (24h)</Text>
                <TimeInput24hMobile
                  label="Início da Tarefa"
                  value={startTime}
                  onChange={(val) => {
                    const nextEnd = syncEndTimeWithStart(val, endTime);
                    setStartTime(val);
                    setEndTime(nextEnd);
                    saveField({ startTime: val, endTime: nextEnd });
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Término (24h)</Text>
                <TimeInput24hMobile
                  label="Fim da Tarefa"
                  value={endTime}
                  onChange={(val) => {
                    const clamped = clampEndTime(startTime, val);
                    setEndTime(clamped);
                    saveField({ endTime: clamped });
                  }}
                />
              </View>
              <View style={{ justifyContent: 'flex-end' }}>
                <Pressable
                  onPress={() => {
                    const exactNow = getCurrentTime24h();
                    const nextEnd = addMinutesToTime24h(exactNow, 60);
                    setStartTime(exactNow);
                    setEndTime(nextEnd);
                    saveField({ startTime: exactNow, endTime: nextEnd });
                  }}
                  style={{
                    backgroundColor: 'rgba(34, 211, 238, 0.2)',
                    borderWidth: 1,
                    borderColor: '#22d3ee',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#a5f3fc',
                      fontSize: 11,
                      fontWeight: '900',
                    }}
                  >
                    ⚡ Agora
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Data (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.smallInput}
                value={scheduledDate}
                onChangeText={handleDateChange}
                placeholder="2026-11-21"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Category Tag & Tag Colors */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.fieldLabel}>Tag de Categoria & Cor</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {tagColors.length < 5 && (
                    <Pressable onPress={onResetTagColors}>
                      <Text style={styles.restoreLink}>Restaurar cores</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setShowAddColor(!showAddColor)}>
                    <Text style={styles.addLink}>+ Cor</Text>
                  </Pressable>
                </View>
              </View>

              <TextInput
                style={[
                  styles.smallInput,
                  {
                    color: selectedTagColor,
                    borderColor: selectedTagColor,
                    fontWeight: '800',
                  },
                ]}
                value={categoryTag}
                onChangeText={(t) => setCategoryTag(t.toUpperCase())}
                onBlur={() => saveField({ categoryTag: categoryTag.trim() })}
                placeholder="EX: PROSPECÇÃO, EDIÇÃO..."
                placeholderTextColor="#64748b"
              />

              {showAddColor && (
                <View style={styles.addInlineBox}>
                  <View style={styles.paletteRow}>
                    {QUICK_PALETTE.map((hex) => (
                      <Pressable
                        key={hex}
                        onPress={() => setNewColorHex(hex)}
                        style={[
                          styles.colorDot,
                          { backgroundColor: hex },
                          newColorHex === hex && styles.colorDotActive,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={[styles.smallInput, { flex: 1 }]}
                      value={newColorHex}
                      onChangeText={setNewColorHex}
                      placeholder="#ec4899"
                      placeholderTextColor="#64748b"
                    />
                    <Pressable
                      onPress={() => {
                        onAddTagColor(newColorHex);
                        setSelectedTagColor(newColorHex);
                        saveField({ tagColor: newColorHex });
                        setShowAddColor(false);
                      }}
                      style={styles.saveMiniBtn}
                    >
                      <Text style={styles.saveMiniText}>Salvar Cor</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.colorsWrap}>
                {tagColors.map((tc) => (
                  <View key={tc.id} style={styles.colorItemWrap}>
                    <Pressable
                      onPress={() => {
                        setSelectedTagColor(tc.hex);
                        saveField({ tagColor: tc.hex });
                      }}
                      style={[
                        styles.colorDot,
                        { backgroundColor: tc.hex },
                        selectedTagColor === tc.hex && styles.colorDotActive,
                      ]}
                    />
                    <Pressable
                      onPress={() => {
                        onDeleteTagColor(tc.id);
                        if (selectedTagColor === tc.hex) {
                          setSelectedTagColor('');
                          saveField({ tagColor: undefined });
                        }
                      }}
                      style={styles.deleteBadge}
                    >
                      <Text style={styles.deleteBadgeText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {/* Priority / Custom Labels */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.fieldLabel}>
                  Etiquetas (Labels / Prioridades)
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {customLabels.length < 3 && (
                    <Pressable onPress={onResetCustomLabels}>
                      <Text style={styles.restoreLink}>Restaurar padrões</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setShowAddLabel(!showAddLabel)}>
                    <Text style={styles.addLink}>+ Nova Label</Text>
                  </Pressable>
                </View>
              </View>

              {showAddLabel && (
                <View style={styles.addInlineBox}>
                  <TextInput
                    style={styles.smallInput}
                    value={newLabelName}
                    onChangeText={setNewLabelName}
                    placeholder="Nome da etiqueta..."
                    placeholderTextColor="#64748b"
                  />
                  <View
                    style={[
                      styles.paletteRow,
                      { marginTop: 8, justifyContent: 'space-between' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {QUICK_PALETTE.map((hex) => (
                        <Pressable
                          key={hex}
                          onPress={() => setNewLabelColor(hex)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: hex },
                            newLabelColor === hex && styles.colorDotActive,
                          ]}
                        />
                      ))}
                    </View>
                    <Pressable
                      onPress={() => {
                        if (newLabelName.trim()) {
                          onCreateLabel(newLabelName.trim(), newLabelColor);
                          setNewLabelName('');
                          setShowAddLabel(false);
                        }
                      }}
                      style={styles.saveMiniBtn}
                    >
                      <Text style={styles.saveMiniText}>Criar</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.labelsWrap}>
                {customLabels.map((lbl) => {
                  const selected = sanitizeCardLabels(
                    card.labels,
                    customLabels
                  ).includes(lbl.id);
                  return (
                    <View key={lbl.id} style={styles.labelPillWrap}>
                      <Pressable
                        onPress={() => {
                          const next = toggleLabelSelection(
                            card.labels,
                            lbl.id,
                            customLabels
                          );
                          saveField({ labels: next });
                        }}
                        style={[
                          styles.labelPill,
                          selected && {
                            borderColor: lbl.color,
                            backgroundColor: `${lbl.color}30`,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.labelDot,
                            { backgroundColor: lbl.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.labelPillText,
                            selected && { color: '#ffffff' },
                          ]}
                        >
                          {lbl.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => onDeleteLabel(lbl.id)}
                        style={styles.deleteLabelBtn}
                      >
                        <Text style={styles.deleteBadgeText}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Descrição e Notas</Text>
              <TextInput
                style={[styles.smallInput, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
                value={description}
                onChangeText={setDescription}
                onBlur={() => saveField({ description })}
                placeholder="Detalhes, links ou observações..."
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Checklist */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>
                Checklist ({doneCount}/{totalCount})
              </Text>
              {(card.checklist || []).map((item) => (
                <View key={item.id} style={styles.checkRow}>
                  <Pressable
                    onPress={() => handleToggleCheckItem(item.id)}
                    style={[
                      styles.checkBox,
                      item.completed && styles.checkBoxDone,
                    ]}
                  >
                    {item.completed && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                  <Text
                    style={[
                      styles.checkText,
                      item.completed && styles.checkTextDone,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Pressable onPress={() => handleDeleteCheckItem(item.id)}>
                    <Text style={styles.deleteCheckText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <TextInput
                  style={[styles.smallInput, { flex: 1 }]}
                  value={newCheckItem}
                  onChangeText={setNewCheckItem}
                  placeholder="Novo item da checklist..."
                  placeholderTextColor="#64748b"
                />
                <Pressable
                  onPress={handleAddChecklistItem}
                  style={styles.saveMiniBtn}
                >
                  <Text style={styles.saveMiniText}>+ Item</Text>
                </Pressable>
              </View>
            </View>

            {/* Move Column */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Mover para Coluna</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {lists.map((l) => (
                    <Pressable
                      key={l.id}
                      onPress={() => saveField({ listId: l.id })}
                      style={[
                        styles.movePill,
                        card.listId === l.id && styles.movePillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.movePillText,
                          card.listId === l.id && { color: '#07050d' },
                        ]}
                      >
                        {l.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Transfer to Friend Board */}
            {boards.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>
                  Transferir para Outro Board (Duo)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {boards
                      .filter((b) => b.id !== card.boardId)
                      .map((b) => (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            onTransferCardToBoard(card.id, b.id);
                            onClose();
                          }}
                          style={styles.transferPill}
                        >
                          <Text style={styles.transferPillText}>
                            ➔ {b.name}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Delete Task */}
            <Pressable
              onPress={() => {
                onDeleteCard(card.id);
                onClose();
              }}
              style={styles.deleteTaskBtn}
            >
              <Text style={styles.deleteTaskText}>🗑 Excluir Tarefa</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 12, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0c0818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    paddingHorizontal: 18,
    paddingBottom: 44,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handleBar: {
    width: 42,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#cbd5e1',
    fontSize: 18,
  },
  titleInput: {
    backgroundColor: '#07050d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  timerBox: {
    backgroundColor: '#120b24',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  timerDigits: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  timerBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerActionText: {
    color: '#07050d',
    fontWeight: '900',
    fontSize: 11,
  },
  resetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetText: {
    color: '#cbd5e1',
    fontWeight: '900',
    fontSize: 13,
  },
  completeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completeBtnText: {
    color: '#052e16',
    fontWeight: '900',
    fontSize: 11,
  },
  row2Col: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  smallInput: {
    backgroundColor: '#07050d',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addLink: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  restoreLink: {
    color: '#94a3b8',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  addInlineBox: {
    backgroundColor: '#130c26',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  colorsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  colorItemWrap: {
    position: 'relative',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  saveMiniBtn: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveMiniText: {
    color: '#07050d',
    fontWeight: '900',
    fontSize: 11,
  },
  labelsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  labelPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteLabelBtn: {
    marginLeft: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(225, 29, 72, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkMark: {
    color: '#052e16',
    fontSize: 11,
    fontWeight: '900',
  },
  checkText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 13,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  deleteCheckText: {
    color: '#f87171',
    fontSize: 13,
    paddingHorizontal: 6,
  },
  movePill: {
    backgroundColor: '#150d2a',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  movePillActive: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  movePillText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
  },
  transferPill: {
    backgroundColor: 'rgba(217, 70, 239, 0.2)',
    borderWidth: 1,
    borderColor: '#d946ef',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  transferPillText: {
    color: '#f5d0fe',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteTaskBtn: {
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  deleteTaskText: {
    color: '#fda4af',
    fontWeight: '800',
    fontSize: 13,
  },
});
