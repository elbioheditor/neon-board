import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  LayoutGrid,
  Trophy,
  Calendar as CalendarIcon,
  Cloud,
  Trash2,
  X,
  CheckCircle2,
  RotateCcw,
  Zap,
  Timer,
  GripVertical,
  Send,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';
import {
  NeonStoreState,
  TaskCard,
  ActiveTab,
  LabelColor,
  RecurrenceConfig,
  CustomLabel,
  TagColorItem,
} from './types';
import {
  INITIAL_STATE,
  LABEL_CONFIG,
  DEFAULT_CUSTOM_LABELS,
  DEFAULT_TAG_COLORS,
  resolveLabelInfo,
} from './data/initialData';
import { NeonParticles } from './components/NeonParticles';
import { KanbanCard } from './components/KanbanCard';
import { CardModal } from './components/CardModal';
import { MonthlyHistoryView } from './components/MonthlyHistoryView';
import { CalendarView } from './components/CalendarView';
import { CloudSyncModal } from './components/CloudSyncModal';
import { TimeInput24h } from './components/TimeInput24h';
import {
  DEFAULT_RECURRENCE_CONFIG,
  RecurrenceButton,
  RecurrencePanel,
} from './components/RecurrenceControl';
import {
  getSavedCloudConfig,
  saveCloudConfig,
  initCloudClient,
  pullCloudState,
  pushCloudState,
  CloudConfig,
} from './lib/cloudSync';
import {
  getYesterdayIsoDate,
  getTodayIsoDate,
  getTomorrowIsoDate,
  getDayAfterTomorrowIsoDate,
  getBrasiliaYearMonth,
  compareCardsByTimeOfDay,
  getLiveElapsedSeconds,
  formatStopwatch,
  resolveSyncedListIdForDate,
  reconcileStateWithBrasiliaTime,
  isYesterdayListTitle,
  isTodayListTitle,
  isTomorrowListTitle,
  isWeekListTitle,
  isStandardDateSyncedList,
  syncEndTimeWithStart,
  clampEndTime,
  getDayPeriodKey,
  PERIOD_ZONE_STYLES,
  DayPeriodKey,
  buildRecurringTaskCards,
  addDaysToIsoDate,
} from './utils/timeUtils';

const LOCAL_STORAGE_KEY = 'neon_board_state_v1';

export function App() {
  const [state, setState] = useState<NeonStoreState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.boards && parsed.lists && parsed.cards) {
          const withDefaults: NeonStoreState = {
            ...parsed,
            customLabels:
              parsed.customLabels && parsed.customLabels.length > 0
                ? parsed.customLabels
                : DEFAULT_CUSTOM_LABELS,
            tagColors:
              parsed.tagColors && parsed.tagColors.length > 0
                ? parsed.tagColors
                : DEFAULT_TAG_COLORS,
          };
          const reconciled = reconcileStateWithBrasiliaTime(withDefaults);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reconciled));
          return reconciled;
        }
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
    }
    return reconcileStateWithBrasiliaTime(INITIAL_STATE);
  });

  // Global 1-second ticker for live stopwatches & Brasília date rollover
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const currentBrasiliaIso = useMemo(() => getTodayIsoDate(), [nowMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Automatically roll tasks forward at 00:00 Brasília time (Tomorrow -> Today, overdue Today -> Yesterday)
  useEffect(() => {
    setState((prev) => {
      const reconciled = reconcileStateWithBrasiliaTime(prev);
      if (reconciled !== prev) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reconciled));
        } catch {
          // ignore
        }
      }
      return reconciled;
    });
  }, [currentBrasiliaIso]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [tabSlideDir, setTabSlideDir] = useState<'right' | 'left'>('right');

  const handleTabChange = (nextTab: ActiveTab) => {
    const tabOrder: Record<ActiveTab, number> = {
      calendar: 0,
      board: 1,
      history: 2,
    };
    if (nextTab !== activeTab) {
      setTabSlideDir(tabOrder[nextTab] >= tabOrder[activeTab] ? 'right' : 'left');
      setActiveTab(nextTab);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInProgress, setOnlyInProgress] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  // Modals & UI states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [showYesterday, setShowYesterday] = useState(false);

  // Adding card inline per column
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardStart, setNewCardStart] = useState('09:00');
  const [newCardEnd, setNewCardEnd] = useState('10:00');
  const [newCardDate, setNewCardDate] = useState(() => getTodayIsoDate());
  const [newCardLabels, setNewCardLabels] = useState<string[]>(['lbl-blue']);
  const [newCardTag, setNewCardTag] = useState('');
  const [newCardTagColor, setNewCardTagColor] = useState('#a855f7');
  const [showInlineAddTagColor, setShowInlineAddTagColor] = useState(false);
  const [inlineTagColorHex, setInlineTagColorHex] = useState('#ec4899');
  const [showInlineAddLabel, setShowInlineAddLabel] = useState(false);
  const [inlineNewLabelName, setInlineNewLabelName] = useState('');
  const [inlineNewLabelColor, setInlineNewLabelColor] = useState('#3b82f6');
  const [newCardRecurrence, setNewCardRecurrence] = useState<RecurrenceConfig>(
    DEFAULT_RECURRENCE_CONFIG
  );

  // Adding new list or board
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  // Editing list title
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  // Drag & Drop state (Cards & Lists)
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [hoverSwitchingBoardId, setHoverSwitchingBoardId] = useState<
    string | null
  >(null);
  const boardHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dragOverBottomAction, setDragOverBottomAction] = useState<
    'complete' | 'delete' | null
  >(null);

  // Cross-board transfer animation & slot-in highlight state
  const [transferAnim, setTransferAnim] = useState<{
    itemTitle: string;
    itemType: 'card' | 'list';
    targetBoardName: string;
    targetOwner: 'Elbioh' | 'Didi';
  } | null>(null);
  const [recentlyTransferredIds, setRecentlyTransferredIds] = useState<
    string[]
  >([]);

  // Toast notification when a task is completed
  const [recentCompletedToast, setRecentCompletedToast] = useState<{
    cardId: string;
    title: string;
    trackedTime: string;
  } | null>(null);

  // Cloud Sync state
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() =>
    getSavedCloudConfig()
  );
  const [syncStatus, setSyncStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');

  const handleInlineStartChange = (val: string) => {
    setNewCardStart(val);
    setNewCardEnd((prevEnd) => syncEndTimeWithStart(val, prevEnd));
  };

  const handleInlineEndChange = (val: string) => {
    setNewCardEnd(clampEndTime(newCardStart, val));
  };

  // Persist to localStorage & push to cloud if enabled
  const updateState = (updater: (prev: NeonStoreState) => NeonStoreState) => {
    setState((prev) => {
      const updated = updater(prev);
      const withDefaults: NeonStoreState = {
        ...updated,
        customLabels:
          updated.customLabels && updated.customLabels.length > 0
            ? updated.customLabels
            : DEFAULT_CUSTOM_LABELS,
        tagColors:
          updated.tagColors && updated.tagColors.length > 0
            ? updated.tagColors
            : DEFAULT_TAG_COLORS,
      };
      const reconciled = reconcileStateWithBrasiliaTime(withDefaults);
      const next = {
        ...reconciled,
        lastUpdated: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem('neon_has_user_edits_v1', 'true');
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      if (cloudConfig.enabled) {
        pushCloudState(next);
      }
      return next;
    });
  };

  // Initialize Supabase Realtime if configured
  useEffect(() => {
    initCloudClient(
      cloudConfig,
      (remoteState) => {
        setState((prev) => {
          const validBoardId = remoteState.boards.some(
            (b) => b.id === prev.activeBoardId
          )
            ? prev.activeBoardId
            : remoteState.boards[0]?.id || prev.activeBoardId;
          const reconciled = reconcileStateWithBrasiliaTime({
            ...remoteState,
            customLabels:
              remoteState.customLabels && remoteState.customLabels.length > 0
                ? remoteState.customLabels
                : DEFAULT_CUSTOM_LABELS,
            tagColors:
              remoteState.tagColors && remoteState.tagColors.length > 0
                ? remoteState.tagColors
                : DEFAULT_TAG_COLORS,
            activeBoardId: validBoardId,
          });
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reconciled));
          } catch {
            // ignore
          }
          return reconciled;
        });
      },
      (status) => {
        setSyncStatus(status);
        if (status === 'connected') {
          pullCloudState().then((remote) => {
            const hasLocalEdits =
              localStorage.getItem('neon_has_user_edits_v1') === 'true';
            if (
              remote &&
              (!hasLocalEdits || remote.lastUpdated > state.lastUpdated)
            ) {
              setState((prev) => {
                const validBoardId = remote.boards.some(
                  (b) => b.id === prev.activeBoardId
                )
                  ? prev.activeBoardId
                  : remote.boards[0]?.id || prev.activeBoardId;
                const reconciled = reconcileStateWithBrasiliaTime({
                  ...remote,
                  customLabels:
                    remote.customLabels && remote.customLabels.length > 0
                      ? remote.customLabels
                      : DEFAULT_CUSTOM_LABELS,
                  tagColors:
                    remote.tagColors && remote.tagColors.length > 0
                      ? remote.tagColors
                      : DEFAULT_TAG_COLORS,
                  activeBoardId: validBoardId,
                });
                try {
                  localStorage.setItem(
                    LOCAL_STORAGE_KEY,
                    JSON.stringify(reconciled)
                  );
                } catch {
                  // ignore
                }
                return reconciled;
              });
            } else {
              pushCloudState(state);
            }
          });
        }
      }
    );
  }, [cloudConfig]);

  const activeBoard = useMemo(
    () =>
      state.boards.find((b) => b.id === state.activeBoardId) || state.boards[0],
    [state.boards, state.activeBoardId]
  );

  const boardLists = useMemo(
    () =>
      state.lists
        .filter((l) => l.boardId === activeBoard.id)
        .sort((a, b) => a.order - b.order),
    [state.lists, activeBoard.id]
  );

  // Active cards on the current board (status !== 'completed')
  const activeBoardCards = useMemo(() => {
    return state.cards.filter((c) => {
      if (c.boardId !== activeBoard.id) return false;
      if (c.status === 'completed') return false;
      if (onlyInProgress && c.status !== 'in_progress') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        const matchTag = (c.categoryTag || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      return true;
    });
  }, [state.cards, activeBoard.id, onlyInProgress, searchQuery]);

  // All completed cards (for Dale view)
  const completedCards = useMemo(
    () => state.cards.filter((c) => c.status === 'completed'),
    [state.cards]
  );

  // Current month completed count for badge (in Brasília time)
  const currentMonthCompletedCount = useMemo(() => {
    const nowYm = getBrasiliaYearMonth();
    return completedCards.filter(
      (c) =>
        c.boardId === activeBoard.id &&
        (c.completedAt || c.createdAt).slice(0, 7) === nowYm
    ).length;
  }, [completedCards, activeBoard.id, currentBrasiliaIso]);

  const selectedCard = useMemo(
    () => state.cards.find((c) => c.id === selectedCardId) || null,
    [state.cards, selectedCardId]
  );

  // Handlers
  const handleSelectBoard = (boardId: string) => {
    setState((prev) => {
      const next = { ...prev, activeBoardId: boardId };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleAddBoard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    const ts = Date.now();
    const newId = 'board-' + ts;
    const isDidi = trimmed.toLowerCase().includes('didi');
    updateState((prev) => ({
      ...prev,
      activeBoardId: newId,
      boards: [
        ...prev.boards,
        {
          id: newId,
          name: trimmed,
          owner: isDidi ? 'Didi' : 'Elbioh',
          subtitle: 'Board Sincronizado',
          accentFrom: '#a855f7',
          accentTo: '#06b6d4',
        },
      ],
      lists: [
        ...prev.lists,
        { id: `${newId}-yesterday`, boardId: newId, title: 'Yesterday', order: 0 },
        { id: `${newId}-today`, boardId: newId, title: 'Today', order: 1 },
        { id: `${newId}-tomorrow`, boardId: newId, title: 'Tomorrow', order: 2 },
        { id: `${newId}-week`, boardId: newId, title: 'This Week', order: 3 },
      ],
    }));
    setNewBoardName('');
    setIsAddingBoard(false);
  };

  const handleDeleteBoard = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (boardId === 'elbioh-board' || boardId === 'didi-board') return;
    if (state.boards.length <= 1) return;
    updateState((prev) => {
      const remaining = prev.boards.filter((b) => b.id !== boardId);
      return {
        ...prev,
        activeBoardId:
          prev.activeBoardId === boardId
            ? remaining[0].id
            : prev.activeBoardId,
        boards: remaining,
        lists: prev.lists.filter((l) => l.boardId !== boardId),
        cards: prev.cards.filter((c) => c.boardId !== boardId),
      };
    });
  };

  const fireNeonConfetti = () => {
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.75 },
        colors: ['#d946ef', '#a855f7', '#06b6d4', '#22d3ee', '#10b981'],
      });
    } catch {
      // ignore
    }
  };

  /**
   * Starts, pauses, or resumes the stopwatch on a task card.
   */
  const handleToggleTimer = (e: React.MouseEvent | null, cardId: string) => {
    if (e) e.stopPropagation();
    const currentNow = Date.now();
    setNowMs(currentNow);

    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => {
        if (c.id !== cardId) return c;

        if (c.status === 'in_progress') {
          const delta = c.timerStartedAt
            ? Math.max(0, Math.floor((currentNow - c.timerStartedAt) / 1000))
            : 0;
          return {
            ...c,
            status: 'paused',
            elapsedSeconds: (c.elapsedSeconds || 0) + delta,
            timerStartedAt: undefined,
          };
        } else {
          return {
            ...c,
            status: 'in_progress',
            timerStartedAt: currentNow,
          };
        }
      }),
    }));
  };

  const handleResetTimer = (cardId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: 'todo',
              elapsedSeconds: 0,
              timerStartedAt: undefined,
            }
          : c
      ),
    }));
  };

  const handleCompleteCard = (e: React.MouseEvent | null, cardId: string) => {
    if (e) e.stopPropagation();
    const target = state.cards.find((c) => c.id === cardId);
    if (!target) return;
    const originList = state.lists.find((l) => l.id === target.listId);
    const currentNow = Date.now();
    const finalElapsed = getLiveElapsedSeconds(target, currentNow);

    fireNeonConfetti();

    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: 'completed',
              elapsedSeconds: finalElapsed,
              timerStartedAt: undefined,
              completedAt: new Date().toISOString(),
              completedFromListTitle: originList?.title || 'Today',
            }
          : c
      ),
    }));

    setRecentCompletedToast({
      cardId: target.id,
      title: target.title,
      trackedTime: formatStopwatch(finalElapsed),
    });
    setTimeout(() => {
      setRecentCompletedToast((prev) =>
        prev?.cardId === cardId ? null : prev
      );
    }, 5500);
  };

  const handleRestoreCard = (cardId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status: c.elapsedSeconds && c.elapsedSeconds > 0 ? 'paused' : 'todo',
              timerStartedAt: undefined,
              completedAt: undefined,
            }
          : c
      ),
    }));
    setRecentCompletedToast(null);
  };

  const handleUpdateCard = (updated: TaskCard) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== cardId),
    }));
  };

  const handleCancelAddCardInline = () => {
    setAddingToListId(null);
    setNewCardTitle('');
    setNewCardTag('');
    setNewCardStart('09:00');
    setNewCardEnd('10:00');
    setNewCardLabels(['lbl-blue']);
    setNewCardTagColor('#a855f7');
    setShowInlineAddTagColor(false);
    setShowInlineAddLabel(false);
    setNewCardRecurrence(DEFAULT_RECURRENCE_CONFIG);
  };

  const handleOpenAddInline = (listId: string, listTitle: string) => {
    setAddingToListId(listId);
    setNewCardTitle('');
    setNewCardTag('');
    setNewCardStart('09:00');
    setNewCardEnd('10:00');
    setNewCardLabels(['lbl-blue']);
    setNewCardTagColor('#a855f7');
    setShowInlineAddTagColor(false);
    setShowInlineAddLabel(false);
    setNewCardRecurrence(DEFAULT_RECURRENCE_CONFIG);
    if (isYesterdayListTitle(listTitle)) {
      setNewCardDate(getYesterdayIsoDate());
    } else if (isTodayListTitle(listTitle)) {
      setNewCardDate(getTodayIsoDate());
    } else if (isTomorrowListTitle(listTitle)) {
      setNewCardDate(getTomorrowIsoDate());
    } else {
      setNewCardDate(getDayAfterTomorrowIsoDate());
    }
  };

  const handleAddCardInline = (e: React.FormEvent, defaultListId: string) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const defaultList = boardLists.find((l) => l.id === defaultListId);
    const isCustomList = Boolean(
      defaultList && !isStandardDateSyncedList(defaultList.title)
    );

    const newCards = buildRecurringTaskCards({
      title: newCardTitle.trim(),
      boardId: activeBoard.id,
      defaultListId,
      isCustomList,
      boardLists,
      baseScheduledDate: newCardDate || getTodayIsoDate(),
      startTime: newCardStart || undefined,
      endTime: newCardEnd || undefined,
      label: newCardLabels,
      categoryTag: newCardTag.trim() || undefined,
      tagColor: newCardTagColor || undefined,
      assignee: activeBoard.owner,
      baseOrder: activeBoardCards.length,
      recurrence: newCardRecurrence,
    });

    updateState((prev) => ({
      ...prev,
      cards: [...prev.cards, ...newCards],
    }));

    handleCancelAddCardInline();
  };

  const handleAddCardFromCalendar = (
    title: string,
    scheduledDate: string,
    startTime: string,
    endTime: string,
    labels: string[],
    categoryTag: string,
    tagColor?: string,
    recurrence?: RecurrenceConfig
  ) => {
    const syncedListId = resolveSyncedListIdForDate(scheduledDate, boardLists);
    if (!syncedListId) return;

    const newCards = buildRecurringTaskCards({
      title,
      boardId: activeBoard.id,
      defaultListId: syncedListId,
      isCustomList: false,
      boardLists,
      baseScheduledDate: scheduledDate,
      startTime,
      endTime,
      label: labels,
      categoryTag: categoryTag.trim() || undefined,
      tagColor: tagColor || undefined,
      assignee: activeBoard.owner,
      baseOrder: activeBoardCards.length,
      recurrence,
    });

    updateState((prev) => ({
      ...prev,
      cards: [...newCards, ...prev.cards],
    }));
  };

  const handleAddTagColor = (hex: string, name?: string) => {
    const newColor: TagColorItem = {
      id: `tc-${Date.now()}`,
      name: name || 'Personalizada',
      hex,
    };
    updateState((prev) => ({
      ...prev,
      tagColors: [...(prev.tagColors || DEFAULT_TAG_COLORS), newColor],
    }));
  };

  const handleDeleteTagColor = (colorId: string) => {
    updateState((prev) => ({
      ...prev,
      tagColors: (prev.tagColors || DEFAULT_TAG_COLORS).filter(
        (c) => c.id !== colorId
      ),
    }));
  };

  const handleCreateLabel = (name: string, color: string) => {
    const newLbl: CustomLabel = {
      id: `lbl-${Date.now()}`,
      name,
      color,
    };
    updateState((prev) => ({
      ...prev,
      customLabels: [...(prev.customLabels || DEFAULT_CUSTOM_LABELS), newLbl],
    }));
  };

  const handleDeleteLabel = (labelId: string) => {
    updateState((prev) => ({
      ...prev,
      customLabels: (prev.customLabels || DEFAULT_CUSTOM_LABELS).filter(
        (l) => l.id !== labelId
      ),
      cards: prev.cards.map((c) => ({
        ...c,
        labels: c.labels.filter((lbl) => lbl !== labelId),
      })),
    }));
  };

  const handleAddDayToTask = (cardId: string) => {
    const target = state.cards.find((c) => c.id === cardId);
    if (!target) return;

    const bLists = state.lists.filter((l) => l.boardId === target.boardId);
    const existingGroupId = target.recurrence?.groupId;

    let nextDate: string;
    let groupId: string;
    let updatedCards = [...state.cards];

    if (existingGroupId) {
      groupId = existingGroupId;
      const groupCards = updatedCards.filter(
        (c) => c.recurrence?.groupId === groupId
      );
      const maxDate = groupCards.reduce((acc, c) => {
        const d = c.scheduledDate || getTodayIsoDate();
        return d > acc ? d : acc;
      }, '0000-00-00');
      nextDate = addDaysToIsoDate(
        maxDate === '0000-00-00'
          ? target.scheduledDate || getTodayIsoDate()
          : maxDate,
        1
      );
      const newDaysCount = groupCards.length + 1;
      updatedCards = updatedCards.map((c) =>
        c.recurrence?.groupId === groupId && c.recurrence.mode === 'days_count'
          ? {
              ...c,
              recurrence: {
                ...c.recurrence,
                daysCount: newDaysCount,
              },
            }
          : c
      );
    } else {
      groupId = `group-${Date.now()}`;
      nextDate = addDaysToIsoDate(target.scheduledDate || getTodayIsoDate(), 1);
      updatedCards = updatedCards.map((c) =>
        c.id === target.id
          ? {
              ...c,
              recurrence: {
                mode: 'days_count',
                daysCount: 2,
                groupId,
              },
            }
          : c
      );
    }

    const targetListId =
      resolveSyncedListIdForDate(nextDate, bLists) || target.listId;

    const newCard: TaskCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      boardId: target.boardId,
      listId: targetListId,
      title: target.title,
      description: target.description,
      status: 'todo',
      startTime: target.startTime,
      endTime: target.endTime,
      scheduledDate: nextDate,
      elapsedSeconds: 0,
      labels: [...target.labels],
      categoryTag: target.categoryTag,
      tagColor: target.tagColor,
      checklist: target.checklist.map((item) => ({
        ...item,
        completed: false,
      })),
      assignee: target.assignee,
      createdAt: new Date().toISOString(),
      recurrence: {
        mode: target.recurrence?.mode || 'days_count',
        daysCount: target.recurrence?.daysCount
          ? target.recurrence.daysCount + 1
          : 2,
        weekdays: target.recurrence?.weekdays
          ? [...target.recurrence.weekdays]
          : undefined,
        specificDays: target.recurrence?.specificDays
          ? [...target.recurrence.specificDays]
          : undefined,
        groupId,
      },
      order: updatedCards.length,
    };

    updatedCards.push(newCard);

    updateState((prev) => ({
      ...prev,
      cards: updatedCards,
    }));
  };

  const handleDeleteRecurringGroup = (groupId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.recurrence?.groupId !== groupId),
    }));
    setSelectedCardId(null);
  };

  const handleMoveCardToDate = (cardId: string, targetIsoDate: string) => {
    updateState((prev) => {
      const card = prev.cards.find((c) => c.id === cardId);
      if (!card) return prev;
      const bLists = prev.lists.filter((l) => l.boardId === card.boardId);
      const currentList = bLists.find((l) => l.id === card.listId);
      const isCustom =
        currentList && !isStandardDateSyncedList(currentList.title);
      const nextListId = isCustom
        ? card.listId
        : resolveSyncedListIdForDate(targetIsoDate, bLists) || card.listId;

      return {
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                scheduledDate: targetIsoDate,
                listId: nextListId,
              }
            : c
        ),
      };
    });
  };

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    const newList = {
      id: 'list-' + Date.now(),
      boardId: activeBoard.id,
      title: newListTitle.trim(),
      order: boardLists.length,
    };
    updateState((prev) => ({
      ...prev,
      lists: [...prev.lists, newList],
    }));
    setNewListTitle('');
    setIsAddingList(false);
  };

  const handleDeleteList = (listId: string) => {
    if (boardLists.length <= 1) return;
    updateState((prev) => ({
      ...prev,
      lists: prev.lists.filter((l) => l.id !== listId),
      cards: prev.cards.filter((c) => c.listId !== listId),
    }));
  };

  const handleSaveListTitle = (listId: string) => {
    if (editingListTitle.trim()) {
      updateState((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, title: editingListTitle.trim() } : l
        ),
      }));
    }
    setEditingListId(null);
  };

  // Drag & Drop handlers (Cards and Lists)
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    setDraggedListId(null);
    e.dataTransfer.setData('text/plain', `card:${cardId}`);
  };

  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    if (draggedCardId) return;
    setDraggedListId(listId);
    e.dataTransfer.setData('text/plain', `list:${listId}`);
  };

  const handleClearDragState = () => {
    if (boardHoverTimerRef.current) {
      clearTimeout(boardHoverTimerRef.current);
      boardHoverTimerRef.current = null;
    }
    setHoverSwitchingBoardId(null);
    setDraggedCardId(null);
    setDraggedListId(null);
    setDragOverListId(null);
    setDragOverBoardId(null);
    setDragOverBottomAction(null);
  };

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      handleClearDragState();
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  const handleDropCompleteCard = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain') || '';
    const activeCardId =
      draggedCardId ||
      (rawData.startsWith('card:') ? rawData.replace('card:', '') : '');
    handleClearDragState();
    if (!activeCardId) return;
    handleCompleteCard(null, activeCardId);
  };

  const handleDropDeleteCard = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain') || '';
    const activeCardId =
      draggedCardId ||
      (rawData.startsWith('card:') ? rawData.replace('card:', '') : '');
    handleClearDragState();
    if (!activeCardId) return;
    handleDeleteCard(activeCardId);
  };

  const handleDragOverList = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (dragOverListId !== listId) {
      setDragOverListId(listId);
    }
  };

  const handleDropOnList = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain') || '';
    const activeCardId =
      draggedCardId ||
      (rawData.startsWith('card:') ? rawData.replace('card:', '') : '');
    const activeListId =
      draggedListId ||
      (rawData.startsWith('list:') ? rawData.replace('list:', '') : '');

    handleClearDragState();

    // Reordering a list within the same board
    if (activeListId) {
      if (activeListId === targetListId) return;
      updateState((prev) => {
        const currentLists = prev.lists
          .filter((l) => l.boardId === activeBoard.id)
          .sort((a, b) => a.order - b.order);
        const fromIdx = currentLists.findIndex((l) => l.id === activeListId);
        const toIdx = currentLists.findIndex((l) => l.id === targetListId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const reordered = [...currentLists];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);

        const orderMap = new Map(reordered.map((l, idx) => [l.id, idx]));
        return {
          ...prev,
          lists: prev.lists.map((l) =>
            orderMap.has(l.id) ? { ...l, order: orderMap.get(l.id)! } : l
          ),
        };
      });
      return;
    }

    if (!activeCardId) return;

    const targetList = state.lists.find((l) => l.id === targetListId);
    const targetBoard = targetList
      ? state.boards.find((b) => b.id === targetList.boardId)
      : null;
    const targetTitle = targetList?.title || '';

    updateState((prev) => {
      const targetCards = prev.cards.filter(
        (c) => c.listId === targetListId && c.status !== 'completed'
      );
      return {
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.id !== activeCardId) return c;
          let nextDate = c.scheduledDate || getTodayIsoDate();
          if (isYesterdayListTitle(targetTitle)) {
            nextDate = getYesterdayIsoDate();
          } else if (isTodayListTitle(targetTitle)) {
            nextDate = getTodayIsoDate();
          } else if (isTomorrowListTitle(targetTitle)) {
            nextDate = getTomorrowIsoDate();
          } else if (
            isWeekListTitle(targetTitle) &&
            nextDate <= getTomorrowIsoDate()
          ) {
            nextDate = getDayAfterTomorrowIsoDate();
          }
          return {
            ...c,
            boardId: targetList ? targetList.boardId : c.boardId,
            assignee: targetBoard ? targetBoard.owner : c.assignee,
            listId: targetListId,
            scheduledDate: nextDate,
            order: targetCards.length,
          };
        }),
      };
    });
  };

  /**
   * Transfers a dragged Card OR an entire dragged List to another Board
   * with a portal animation and a slotting-in arrival animation on the target board.
   */
  const handleDropOnBoard = (e: React.DragEvent, targetBoardId: string) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain') || '';
    const activeCardId =
      draggedCardId ||
      (rawData.startsWith('card:') ? rawData.replace('card:', '') : '');
    const activeListId =
      draggedListId ||
      (rawData.startsWith('list:') ? rawData.replace('list:', '') : '');

    handleClearDragState();

    if (targetBoardId === activeBoard.id) return;
    const targetBoard = state.boards.find((b) => b.id === targetBoardId);
    if (!targetBoard) return;

    // 1. Transferring a single Card to the other Board
    if (activeCardId) {
      const card = state.cards.find((c) => c.id === activeCardId);
      if (!card) return;
      const sourceList = state.lists.find((l) => l.id === card.listId);

      setTransferAnim({
        itemTitle: card.title,
        itemType: 'card',
        targetBoardName: targetBoard.name,
        targetOwner: targetBoard.owner,
      });

      setTimeout(() => {
        updateState((prev) => {
          const targetBoardLists = prev.lists
            .filter((l) => l.boardId === targetBoard.id)
            .sort((a, b) => a.order - b.order);

          const matchingByName = targetBoardLists.find(
            (l) =>
              l.title.trim().toLowerCase() ===
              (sourceList?.title || '').trim().toLowerCase()
          );

          const destListId =
            matchingByName?.id ||
            resolveSyncedListIdForDate(
              card.scheduledDate || getTodayIsoDate(),
              targetBoardLists
            ) ||
            targetBoardLists[0]?.id;

          return {
            ...prev,
            activeBoardId: targetBoard.id,
            cards: prev.cards.map((c) =>
              c.id === card.id
                ? {
                    ...c,
                    boardId: targetBoard.id,
                    listId: destListId || c.listId,
                    assignee: targetBoard.owner,
                  }
                : c
            ),
          };
        });

        setRecentlyTransferredIds([card.id]);
        setTimeout(() => setTransferAnim(null), 220);
        setTimeout(() => setRecentlyTransferredIds([]), 1500);
      }, 420);
      return;
    }

    // 2. Transferring an entire List (Column) to the other Board
    if (activeListId) {
      const sourceList = state.lists.find((l) => l.id === activeListId);
      if (!sourceList) return;

      setTransferAnim({
        itemTitle: `Lista "${sourceList.title}"`,
        itemType: 'list',
        targetBoardName: targetBoard.name,
        targetOwner: targetBoard.owner,
      });

      setTimeout(() => {
        let transferredHighlightIds: string[] = [];

        updateState((prev) => {
          const targetBoardLists = prev.lists
            .filter((l) => l.boardId === targetBoard.id)
            .sort((a, b) => a.order - b.order);
          const sourceBoardLists = prev.lists.filter(
            (l) => l.boardId === sourceList.boardId
          );

          const matchingTargetList = targetBoardLists.find(
            (l) =>
              l.title.trim().toLowerCase() ===
              sourceList.title.trim().toLowerCase()
          );

          const isDefaultListName = isStandardDateSyncedList(sourceList.title);

          const listActiveCards = prev.cards.filter(
            (c) => c.listId === sourceList.id && c.status !== 'completed'
          );
          const cardIds = listActiveCards.map((c) => c.id);

          // If target board already has a standard column with the same name (e.g. Today -> Today),
          // transfer all cards into that matching column so we don't duplicate "Today"
          if (matchingTargetList && isDefaultListName) {
            transferredHighlightIds = [matchingTargetList.id, ...cardIds];
            return {
              ...prev,
              activeBoardId: targetBoard.id,
              cards: prev.cards.map((c) =>
                cardIds.includes(c.id)
                  ? {
                      ...c,
                      boardId: targetBoard.id,
                      listId: matchingTargetList.id,
                      assignee: targetBoard.owner,
                    }
                  : c
              ),
            };
          }

          // Otherwise, move the entire column itself to the target board
          transferredHighlightIds = [sourceList.id, ...cardIds];
          const updatedLists = prev.lists.map((l) =>
            l.id === sourceList.id
              ? {
                  ...l,
                  boardId: targetBoard.id,
                  order: targetBoardLists.length,
                }
              : l
          );

          // Ensure source board keeps at least 1 default column if moving its last column
          if (sourceBoardLists.length <= 1) {
            updatedLists.push({
              id: 'list-' + Date.now(),
              boardId: sourceList.boardId,
              title: 'Today',
              order: 0,
            });
          }

          return {
            ...prev,
            activeBoardId: targetBoard.id,
            lists: updatedLists,
            cards: prev.cards.map((c) =>
              c.listId === sourceList.id && c.status !== 'completed'
                ? {
                    ...c,
                    boardId: targetBoard.id,
                    assignee: targetBoard.owner,
                  }
                : c
            ),
          };
        });

        setRecentlyTransferredIds(transferredHighlightIds);
        setTimeout(() => setTransferAnim(null), 220);
        setTimeout(() => setRecentlyTransferredIds([]), 1500);
      }, 420);
    }
  };

  const runningCards = useMemo(
    () =>
      state.cards.filter(
        (c) => c.boardId === activeBoard.id && c.status === 'in_progress'
      ),
    [state.cards, activeBoard.id]
  );

  /**
   * Groups sorted cards of a column into contiguous period segments
   * ('morning' = Blue, 'afternoon' = Yellowish, 'night' = Dark Blue)
   * so the list background changes color edge-to-edge according to the hours of the day.
   */
  const groupCardsByPeriodSegments = (sortedCards: TaskCard[]) => {
    const segments: { period: DayPeriodKey; items: TaskCard[] }[] = [];
    sortedCards.forEach((card) => {
      const p = getDayPeriodKey(card.startTime);
      const last = segments[segments.length - 1];
      if (last && last.period === p) {
        last.items.push(card);
      } else {
        segments.push({ period: p, items: [card] });
      }
    });
    return segments;
  };

  const isDraggingAnything = Boolean(draggedCardId || draggedListId);
  const appBrandName = window.neonDesktop?.brandName || 'NEON';
  const appVersion = window.neonDesktop?.version || '1.2.0';

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#07050d] text-slate-100 overflow-hidden select-none">
      {/* Floating Purple & Cyan Particles (Neon FX toggle, NO purple/blue radial gradient background) */}
      <NeonParticles enabled={particlesEnabled} />

      {/* TOP HEADER / DRAGGABLE TITLEBAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#090612]/95 border-b border-purple-500/25 backdrop-blur-xl app-drag-region pr-36">
        {/* Left: Brand (NEON on Elbioh's PC / SHADOWJOKER on Brother's PC) + Board Switcher Tabs */}
        <div className="flex items-center gap-5 app-no-drag">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-lg shadow-fuchsia-500/25">
              <div className="w-full h-full bg-[#090612] rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300/30" />
              </div>
            </div>
            <span className="text-lg font-extrabold font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-cyan-300">
              {appBrandName}
            </span>
          </div>

          {/* Board Selector: Elbioh's Board, Didi's Board, and custom boards (Drag & Drop a Card or List here!) */}
          <div className="flex items-center gap-1.5 bg-[#120b24] p-1 rounded-xl border border-purple-500/30">
            {state.boards.map((b) => {
              const isSelected = b.id === activeBoard.id;
              const isDropTarget =
                isDraggingAnything &&
                b.id !== activeBoard.id &&
                dragOverBoardId === b.id;
              const isCustomBoard = b.id !== 'elbioh-board' && b.id !== 'didi-board';

              return (
                <div key={b.id} className="relative group/board flex items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectBoard(b.id)}
                    onDragOver={(e) => {
                      if (b.id !== activeBoard.id) {
                        e.preventDefault();
                        if (dragOverBoardId !== b.id) {
                          setDragOverBoardId(b.id);
                        }
                        if (hoverSwitchingBoardId !== b.id) {
                          if (boardHoverTimerRef.current) {
                            clearTimeout(boardHoverTimerRef.current);
                          }
                          setHoverSwitchingBoardId(b.id);
                          boardHoverTimerRef.current = setTimeout(() => {
                            handleSelectBoard(b.id);
                            setHoverSwitchingBoardId(null);
                            setDragOverBoardId(null);
                          }, 500);
                        }
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverBoardId === b.id) setDragOverBoardId(null);
                      if (hoverSwitchingBoardId === b.id) {
                        if (boardHoverTimerRef.current) {
                          clearTimeout(boardHoverTimerRef.current);
                          boardHoverTimerRef.current = null;
                        }
                        setHoverSwitchingBoardId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (boardHoverTimerRef.current) {
                        clearTimeout(boardHoverTimerRef.current);
                        boardHoverTimerRef.current = null;
                      }
                      setHoverSwitchingBoardId(null);
                      handleDropOnBoard(e, b.id);
                    }}
                    className={`apple-bounce flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hoverSwitchingBoardId === b.id
                        ? 'bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 text-white ring-2 ring-cyan-300 scale-105 shadow-xl shadow-cyan-400/60 animate-pulse'
                        : isDropTarget
                        ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white ring-2 ring-cyan-300 scale-105 shadow-lg shadow-cyan-400/50'
                        : isSelected
                        ? b.owner === 'Elbioh'
                          ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md shadow-fuchsia-500/30'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md shadow-cyan-500/30'
                        : isDraggingAnything
                        ? 'text-cyan-200 bg-cyan-500/15 border border-dashed border-cyan-400/60 animate-pulse'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-extrabold ${
                        b.owner === 'Elbioh'
                          ? 'bg-fuchsia-400/30 text-fuchsia-200'
                          : 'bg-cyan-400/30 text-cyan-200'
                      }`}
                    >
                      {b.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{b.name}</span>
                  </button>
                  {isCustomBoard && state.boards.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBoard(e, b.id)}
                      title="Excluir este Board"
                      className="opacity-0 group-hover/board:opacity-100 -ml-1.5 mr-0.5 p-0.5 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add New Board inline button/form */}
            {isAddingBoard ? (
              <div className="flex items-center gap-1 pl-1 pr-1">
                <input
                  type="text"
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddBoard();
                    if (e.key === 'Escape') {
                      setIsAddingBoard(false);
                      setNewBoardName('');
                    }
                  }}
                  placeholder="Nome do Board..."
                  className="w-28 bg-[#0b0716] border border-cyan-400/60 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBoard}
                  className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#090514] text-[10px] font-extrabold cursor-pointer"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBoard(false);
                    setNewBoardName('');
                  }}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingBoard(true)}
                title="Criar novo Board compartilhado"
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center: Search + Active Stopwatch Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md app-no-drag">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar em ${activeBoard.name}...`}
              className="w-full bg-[#130d26]/90 border border-purple-500/30 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyInProgress(!onlyInProgress)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              onlyInProgress
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                : 'bg-[#130d26]/80 border-purple-500/25 text-slate-300 hover:text-white'
            }`}
          >
            <Timer
              className={`w-3.5 h-3.5 text-cyan-400 ${
                runningCards.length > 0 ? 'animate-spin' : ''
              }`}
            />
            <span>Cronometrando ({runningCards.length})</span>
          </button>
        </div>

        {/* Right Controls: Neon FX & Sync */}
        <div className="flex items-center gap-2 app-no-drag">
          <button
            type="button"
            onClick={() => setParticlesEnabled(!particlesEnabled)}
            title="Alternar partículas Neon de fundo"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              particlesEnabled
                ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            ✨ Neon FX
          </button>

          <button
            type="button"
            onClick={() => setIsCloudModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600/30 to-cyan-500/30 hover:from-purple-600/45 hover:to-cyan-500/45 border border-cyan-400/40 text-cyan-200 transition-all cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : 'bg-cyan-400'
              }`}
            />
            <Cloud className="w-3.5 h-3.5" />
            <span>Sync / Backup</span>
          </button>

          <span
            title={`Versão instalada: v${appVersion}`}
            className="px-2 py-1 rounded-lg bg-[#130d26]/90 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-300/90 tracking-tight"
          >
            v{appVersion}
          </span>
        </div>
      </header>

      {/* FULL-WIDTH BOTTOM DROP ZONES WHEN DRAGGING A TASK: COMPLETE ZONE (LEFT/MAIN) + TRASH ZONE (RIGHT) */}
      {draggedCardId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 h-24 flex items-stretch select-none">
          {/* Green Complete Zone (Occupies the main bottom area) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverBottomAction !== 'complete') {
                setDragOverBottomAction('complete');
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) {
                return;
              }
              if (dragOverBottomAction === 'complete') {
                setDragOverBottomAction(null);
              }
            }}
            onDrop={handleDropCompleteCard}
            className={`flex-1 flex items-center justify-center gap-3.5 px-8 border-t-2 backdrop-blur-2xl cursor-pointer transition-[box-shadow,background-color,border-color,transform] duration-300 ease-out ${
              dragOverBottomAction === 'complete'
                ? 'bg-gradient-to-t from-emerald-500/95 via-emerald-500/80 to-emerald-400/50 border-emerald-200 text-slate-950 shadow-[0_-18px_55px_rgba(16,185,129,0.85)]'
                : 'bg-gradient-to-t from-emerald-950/95 via-emerald-900/80 to-emerald-800/45 border-emerald-400/70 text-emerald-100 hover:from-emerald-900/95 shadow-none'
            }`}
          >
            <CheckCircle2
              className={`w-7 h-7 flex-shrink-0 transition-transform duration-300 pointer-events-none ${
                dragOverBottomAction === 'complete'
                  ? 'text-slate-950 scale-125'
                  : 'text-emerald-400 animate-pulse'
              }`}
            />
            <div className="pointer-events-none">
              <p
                className={`text-sm font-extrabold uppercase tracking-wider ${
                  dragOverBottomAction === 'complete'
                    ? 'text-slate-950'
                    : 'text-emerald-100'
                }`}
              >
                Solte aqui para Finalizar Tarefa
              </p>
              <p
                className={`text-xs ${
                  dragOverBottomAction === 'complete'
                    ? 'text-slate-900 font-bold'
                    : 'text-emerald-300/85'
                }`}
              >
                Concluir com confete e salvar tempo cronometrado no Dale
              </p>
            </div>
          </div>

          {/* Red Trash Delete Zone (Occupies the bottom-right area) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverBottomAction !== 'delete') {
                setDragOverBottomAction('delete');
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) {
                return;
              }
              if (dragOverBottomAction === 'delete') {
                setDragOverBottomAction(null);
              }
            }}
            onDrop={handleDropDeleteCard}
            className={`w-72 sm:w-80 flex-shrink-0 flex items-center justify-center gap-3 px-6 border-t-2 border-l-2 backdrop-blur-2xl cursor-pointer transition-[box-shadow,background-color,border-color,transform] duration-300 ease-out ${
              dragOverBottomAction === 'delete'
                ? 'bg-gradient-to-t from-rose-500/95 via-rose-500/80 to-rose-400/50 border-rose-200 text-white shadow-[0_-18px_55px_rgba(244,63,94,0.85)]'
                : 'bg-gradient-to-t from-rose-950/95 via-rose-900/80 to-rose-800/45 border-rose-500/70 text-rose-100 hover:from-rose-900/95 shadow-none'
            }`}
          >
            <Trash2
              className={`w-6 h-6 flex-shrink-0 transition-transform duration-300 pointer-events-none ${
                dragOverBottomAction === 'delete'
                  ? 'text-white scale-125'
                  : 'text-rose-400'
              }`}
            />
            <div className="pointer-events-none">
              <p className="text-sm font-extrabold uppercase tracking-wider text-white">
                Lixeira
              </p>
              <p
                className={`text-xs ${
                  dragOverBottomAction === 'delete'
                    ? 'text-rose-100 font-bold'
                    : 'text-rose-300/85'
                }`}
              >
                Jogar tarefa fora
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED CROSS-BOARD TRANSFER OVERLAY */}
      {transferAnim && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="animate-fly-portal flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-2xl shadow-cyan-400/50 border border-white/40">
            <Send className="w-6 h-6 text-cyan-200 animate-bounce" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-100">
                Transferindo {transferAnim.itemType === 'list' ? 'Lista' : 'Tarefa'}...
              </p>
              <p className="text-base font-extrabold font-display">
                {transferAnim.itemTitle} ➔ {transferAnim.targetBoardName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="relative z-10 flex-1 overflow-hidden">
        <div
          key={activeTab}
          className={`w-full h-full ${
            tabSlideDir === 'right'
              ? 'animate-slide-in-right'
              : 'animate-slide-in-left'
          }`}
        >
          {activeTab === 'board' && (
            <div
              key={activeBoard.id}
              className="h-full overflow-x-auto overflow-y-hidden px-6 pt-5 pb-24 flex items-start gap-5"
            >
              {boardLists.map((list, colIdx) => {
              const listCards = activeBoardCards
                .filter((c) => c.listId === list.id)
                .sort(compareCardsByTimeOfDay);

              const periodSegments = groupCardsByPeriodSegments(listCards);
              const isDragTarget = dragOverListId === list.id;
              const isListRecentlyTransferred = recentlyTransferredIds.includes(
                list.id
              );
              const isTodayColumn = isTodayListTitle(list.title);
              const isYesterdayColumn = isYesterdayListTitle(list.title);

              // Hidden side toggle button for "Yesterday" (Overdue tasks) so "Today" is visually first
              if (isYesterdayColumn && !showYesterday) {
                const hasOverdue = listCards.length > 0;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setShowYesterday(true)}
                    onDragOver={(e) => handleDragOverList(e, list.id)}
                    onDragLeave={() => setDragOverListId(null)}
                    onDrop={(e) => handleDropOnList(e, list.id)}
                    title={
                      hasOverdue
                        ? `Mostrar Yesterday (${listCards.length} tarefas atrasadas)`
                        : 'Mostrar aba Yesterday (tarefas atrasadas)'
                    }
                    className={`w-11 flex-shrink-0 py-4 px-1.5 rounded-2xl border backdrop-blur-xl flex flex-col items-center justify-between gap-3.5 transition-all cursor-pointer shadow-xl group ${
                      isDragTarget
                        ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/30 scale-105'
                        : hasOverdue
                        ? 'bg-gradient-to-b from-rose-950/80 via-[#160a1d]/95 to-purple-950/80 border-rose-500/50 hover:border-rose-400 shadow-rose-950/50'
                        : 'bg-[#0d091a]/90 border-purple-500/25 hover:border-purple-400/50 hover:bg-[#140e28]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-transform group-hover:translate-x-0.5 ${
                        hasOverdue
                          ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                          : 'bg-purple-500/15 border-purple-500/30 text-slate-300 group-hover:text-cyan-300'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        hasOverdue
                          ? 'bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-500/40 animate-pulse'
                          : 'bg-purple-500/20 text-slate-300 border-purple-500/30'
                      }`}
                    >
                      {listCards.length}
                    </span>

                    <div className="py-1 flex flex-col items-center justify-center leading-[1.15]">
                      {list.title
                        .toUpperCase()
                        .split('')
                        .map((char, cIdx) => (
                          <span
                            key={cIdx}
                            className={`text-[10px] font-extrabold font-display ${
                              hasOverdue
                                ? 'text-rose-300'
                                : 'text-slate-400 group-hover:text-white'
                            }`}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        ))}
                    </div>

                    {hasOverdue && (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={list.id}
                  style={{ animationDelay: `${colIdx * 45}ms` }}
                  draggable={editingListId !== list.id && !addingToListId}
                  onDragStart={(e) => handleListDragStart(e, list.id)}
                  onDragEnd={handleClearDragState}
                  onDragOver={(e) => handleDragOverList(e, list.id)}
                  onDragLeave={() => setDragOverListId(null)}
                  onDrop={(e) => handleDropOnList(e, list.id)}
                  className={`w-[335px] flex-shrink-0 max-h-full flex flex-col rounded-2xl bg-[#0d091a]/95 backdrop-blur-xl border overflow-hidden transition-all shadow-2xl animate-board-column ${
                    isDragTarget
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                      : isYesterdayColumn && listCards.length > 0
                      ? 'border-rose-500/40'
                      : 'border-purple-500/25'
                  } ${
                    isListRecentlyTransferred || isYesterdayColumn
                      ? 'animate-slot-in'
                      : ''
                  }`}
                >
                  {/* Top Neon Strip on Each List */}
                  <div
                    className={`h-1 w-full flex-shrink-0 ${
                      isYesterdayColumn && listCards.length > 0
                        ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500'
                        : 'bg-gradient-to-r from-fuchsia-500/80 via-purple-500/80 to-cyan-400/80'
                    }`}
                  />

                  {/* Column Header (Draggable Grip + Title + Count + Hide/Delete) */}
                  <div className="flex items-center justify-between px-3.5 py-3 bg-[#0d091a] border-b border-white/10 flex-shrink-0 cursor-grab active:cursor-grabbing">
                    {editingListId === list.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        onBlur={() => handleSaveListTitle(list.id)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleSaveListTitle(list.id)
                        }
                        className="bg-[#181130] text-sm font-bold text-white px-2 py-0.5 rounded border border-cyan-400 focus:outline-none"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditingListId(list.id);
                          setEditingListTitle(list.title);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                        title="Clique para renomear ou arraste a lista para outro Board"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-300 transition-colors" />
                        <h3 className="text-sm font-bold font-display text-white tracking-wide">
                          {list.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            isYesterdayColumn && listCards.length > 0
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-purple-500/20 text-cyan-300 border-purple-500/30'
                          }`}
                        >
                          {listCards.length}
                        </span>
                        {isYesterdayColumn && listCards.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/35">
                            Atrasadas
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {isYesterdayColumn ? (
                        <button
                          type="button"
                          onClick={() => setShowYesterday(false)}
                          title="Esconder lista Yesterday na lateral"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3 h-3" />
                          <span>Esconder</span>
                        </button>
                      ) : (
                        boardLists.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteList(list.id)}
                            title="Excluir lista"
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Cards Container: FULL-BLEED Time-of-Day Colored Background Zones (edge-to-edge, no rounded box gaps) */}
                  <div className="flex-1 overflow-y-auto flex flex-col p-0">
                    {periodSegments.map((seg, segIdx) => {
                      const zoneStyle = PERIOD_ZONE_STYLES[seg.period];
                      const isLastSegment =
                        segIdx === periodSegments.length - 1 &&
                        addingToListId !== list.id;

                      return (
                        <div
                          key={`${seg.period}-${segIdx}`}
                          className={`w-full px-3.5 py-3 space-y-2.5 transition-colors ${
                            zoneStyle.listZoneClass
                          } ${isLastSegment ? 'flex-1' : ''}`}
                        >
                          {seg.items.map((card) => (
                            <KanbanCard
                              key={card.id}
                              card={card}
                              nowMs={nowMs}
                              isTodayList={isTodayColumn}
                              isRecentlyTransferred={recentlyTransferredIds.includes(
                                card.id
                              )}
                              customLabels={state.customLabels}
                              onOpenModal={(c) => setSelectedCardId(c.id)}
                              onToggleTimer={handleToggleTimer}
                              onResetTimer={handleResetTimer}
                              onCompleteCard={handleCompleteCard}
                              onDragStart={handleCardDragStart}
                              onDragEnd={handleClearDragState}
                            />
                          ))}
                        </div>
                      );
                    })}

                    {listCards.length === 0 && addingToListId !== list.id && (
                      <div className="p-3.5">
                        <div className="py-6 px-3 text-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
                          Nenhuma tarefa ativa em <strong>{list.title}</strong>.
                        </div>
                      </div>
                    )}

                    {/* Inline Add Card Form */}
                    {addingToListId === list.id && (
                      <div className="p-2.5 bg-[#0d091a] border-t border-white/10 flex-shrink-0">
                        <form
                          onSubmit={(e) => handleAddCardInline(e, list.id)}
                          className="p-3.5 rounded-2xl bg-[#0b0717] border-2 border-cyan-400 space-y-3 shadow-2xl shadow-cyan-950/60 min-w-0"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            placeholder="O que você vai fazer?"
                            className="w-full bg-[#070412] border-2 border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300 shadow-sm"
                          />

                          {/* 24h Schedule Hours Row with Auto-Synced End Time */}
                          <div className="flex items-center justify-between gap-1.5">
                            <TimeInput24h
                              value={newCardStart}
                              onChange={handleInlineStartChange}
                            />
                            <span className="text-xs font-semibold text-slate-400 px-1">
                              até
                            </span>
                            <TimeInput24h
                              value={newCardEnd}
                              onChange={handleInlineEndChange}
                            />
                          </div>

                          {/* Date + Category Tag Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={newCardDate}
                              onChange={(e) => setNewCardDate(e.target.value)}
                              className="bg-[#070412] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-purple-500"
                              title="Dia da tarefa (Sincroniza com o Calendário)"
                            />
                            <input
                              type="text"
                              value={newCardTag}
                              onChange={(e) =>
                                setNewCardTag(e.target.value.toUpperCase())
                              }
                              placeholder="TAG (EX: EDIÇÃO)"
                              style={{ color: newCardTagColor }}
                              className="bg-[#070412] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-[11px] font-bold uppercase focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Tag Color Picker */}
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold">Cor da Tag:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowInlineAddTagColor(!showInlineAddTagColor)
                                }
                                className="text-[9px] text-cyan-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Nova Cor</span>
                              </button>
                            </div>

                            {showInlineAddTagColor && (
                              <div className="flex items-center gap-1.5 p-1.5 bg-[#070412] rounded-lg border border-cyan-400/30">
                                <input
                                  type="color"
                                  value={inlineTagColorHex}
                                  onChange={(e) =>
                                    setInlineTagColorHex(e.target.value)
                                  }
                                  className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                                />
                                <input
                                  type="text"
                                  value={inlineTagColorHex}
                                  onChange={(e) =>
                                    setInlineTagColorHex(e.target.value)
                                  }
                                  className="w-16 bg-black/40 text-[10px] font-mono px-1.5 py-0.5 rounded text-white border border-white/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddTagColor(inlineTagColorHex);
                                    setNewCardTagColor(inlineTagColorHex);
                                    setShowInlineAddTagColor(false);
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold bg-cyan-500/30 text-cyan-200 rounded border border-cyan-400/40 cursor-pointer"
                                >
                                  Salvar
                                </button>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(state.tagColors || DEFAULT_TAG_COLORS).map(
                                (tc) => (
                                  <div
                                    key={tc.id}
                                    className="relative group/tagcol"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setNewCardTagColor(tc.hex)}
                                      className={`w-4 h-4 rounded-full cursor-pointer transition-all ${
                                        newCardTagColor === tc.hex
                                          ? 'ring-2 ring-white scale-125'
                                          : 'opacity-50 hover:opacity-100'
                                      }`}
                                      style={{ backgroundColor: tc.hex }}
                                      title={tc.name}
                                    />
                                    {!['purple', 'yellow', 'red', 'green', 'cyan'].includes(
                                      tc.id
                                    ) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTagColor(tc.id);
                                        }}
                                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/tagcol:opacity-100 transition-opacity"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Priority Labels Row */}
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold">Labels:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowInlineAddLabel(!showInlineAddLabel)
                                }
                                className="text-[9px] text-cyan-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Nova Label</span>
                              </button>
                            </div>

                            {showInlineAddLabel && (
                              <div className="flex items-center gap-1.5 p-1.5 bg-[#070412] rounded-lg border border-purple-400/30">
                                <input
                                  type="text"
                                  placeholder="Nome"
                                  value={inlineNewLabelName}
                                  onChange={(e) =>
                                    setInlineNewLabelName(e.target.value)
                                  }
                                  className="flex-1 min-w-0 bg-black/40 text-[10px] px-1.5 py-0.5 rounded text-white border border-white/20"
                                />
                                <input
                                  type="color"
                                  value={inlineNewLabelColor}
                                  onChange={(e) =>
                                    setInlineNewLabelColor(e.target.value)
                                  }
                                  className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!inlineNewLabelName.trim()) return;
                                    handleCreateLabel(
                                      inlineNewLabelName.trim(),
                                      inlineNewLabelColor
                                    );
                                    setInlineNewLabelName('');
                                    setShowInlineAddLabel(false);
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold bg-purple-500/30 text-purple-200 rounded border border-purple-400/40 cursor-pointer"
                                >
                                  Salvar
                                </button>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1">
                              {(state.customLabels || DEFAULT_CUSTOM_LABELS).map(
                                (lbl) => {
                                  const isSelected = newCardLabels.includes(
                                    lbl.id
                                  );
                                  const isDefault = [
                                    'lbl-blue',
                                    'lbl-yellow',
                                    'lbl-red',
                                  ].includes(lbl.id);
                                  return (
                                    <div
                                      key={lbl.id}
                                      className="relative group/lbl"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCardLabels((prev) =>
                                            prev.includes(lbl.id)
                                              ? prev.filter((id) => id !== lbl.id)
                                              : [...prev, lbl.id]
                                          );
                                        }}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'text-white border-white/40 shadow-sm'
                                            : 'text-slate-400 border-transparent hover:text-white bg-white/5'
                                        }`}
                                        style={
                                          isSelected
                                            ? {
                                                backgroundColor: `${lbl.color}40`,
                                                borderColor: lbl.color,
                                              }
                                            : undefined
                                        }
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{
                                            backgroundColor: lbl.color,
                                          }}
                                        />
                                        <span>{lbl.name}</span>
                                      </button>
                                      {!isDefault && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteLabel(lbl.id);
                                          }}
                                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/lbl:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          {/* Recurrence Button Row */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <RecurrenceButton
                              config={newCardRecurrence}
                              onChange={setNewCardRecurrence}
                              compact
                            />
                          </div>

                          {/* Action Buttons: Cancelar (Wine/Red) + Adicionar (Fuchsia-Cyan) */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelAddCardInline}
                              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#380e25] hover:bg-[#501334] border border-rose-500/40 text-[#f472b6] hover:text-white cursor-pointer transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(6,182,212,0.55)] hover:opacity-95 cursor-pointer transition-all"
                            >
                              Adicionar
                            </button>
                          </div>

                          {/* Recurrence Options Panel (when Rotina is toggled) */}
                          <RecurrencePanel
                            config={newCardRecurrence}
                            onChange={setNewCardRecurrence}
                          />
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Column Footer: "+ Add a card" */}
                  {addingToListId !== list.id && (
                    <div className="p-2.5 bg-[#0d091a] border-t border-white/10 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAddInline(list.id, list.title)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-purple-500/15 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-cyan-400" />
                        <span>Add a card</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* "+ Add another list" button */}
            <div className="w-[300px] flex-shrink-0">
              {isAddingList ? (
                <form
                  onSubmit={handleAddList}
                  className="p-3.5 rounded-2xl bg-[#110b22]/95 border border-cyan-400/40 space-y-2.5 shadow-xl"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="Nome da nova lista..."
                    className="w-full bg-[#090612] border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingList(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-500 text-white cursor-pointer"
                    >
                      Criar Lista
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingList(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-purple-950/35 hover:bg-purple-900/45 border border-purple-500/30 hover:border-cyan-400/50 text-xs font-bold text-purple-200 hover:text-white backdrop-blur-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Add another list</span>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div key={activeBoard.id} className="w-full h-full animate-board-switch">
            <CalendarView
              board={activeBoard}
              lists={boardLists}
              cards={activeBoardCards}
              nowMs={nowMs}
              customLabels={state.customLabels}
              tagColors={state.tagColors}
              onOpenModal={(c) => setSelectedCardId(c.id)}
              onToggleTimer={handleToggleTimer}
              onResetTimer={handleResetTimer}
              onCompleteCard={handleCompleteCard}
              onAddCardForDate={handleAddCardFromCalendar}
              onAddTagColor={handleAddTagColor}
              onDeleteTagColor={handleDeleteTagColor}
              onCardDragStart={handleCardDragStart}
              onCardDragEnd={handleClearDragState}
              onMoveCardToDate={handleMoveCardToDate}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div key={activeBoard.id} className="w-full h-full animate-board-switch">
            <MonthlyHistoryView
              boards={state.boards}
              activeBoardId={activeBoard.id}
              completedCards={completedCards}
              allCards={state.cards}
              onRestoreCard={handleRestoreCard}
              onDeleteCard={handleDeleteCard}
            />
          </div>
        )}
        </div>
      </main>

      {/* FLOATING COMPLETION TOAST */}
      {recentCompletedToast && (
        <div className="fixed bottom-20 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#140d29]/95 border border-cyan-400/60 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">
              Tarefa Finalizada! (⏱ {recentCompletedToast.trackedTime})
            </p>
            <p className="text-slate-300 line-clamp-1">
              "{recentCompletedToast.title}" foi salva no Dale.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleRestoreCard(recentCompletedToast.cardId)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Desfazer
          </button>
        </div>
      )}

      {/* SINGLE-LINE FLOATING BOTTOM NAVIGATION DOCK (Calendário | Board | Dale | Switch boards) */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-nowrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#0d081a]/95 border border-purple-500/40 shadow-2xl shadow-purple-950/80 backdrop-blur-2xl whitespace-nowrap">
        <button
          type="button"
          onClick={() => handleTabChange('calendar')}
          className={`dock-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span>Calendário</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('board')}
          className={`dock-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'board'
              ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-4 h-4 flex-shrink-0" />
          <span>Board</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`dock-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4 flex-shrink-0" />
          <span>Dale</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'history'
                ? 'bg-black/25 text-white'
                : 'bg-cyan-500/20 text-cyan-300'
            }`}
          >
            {currentMonthCompletedCount}
          </span>
        </button>
      </nav>

      {/* CARD DETAILS MODAL */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          nowMs={nowMs}
          lists={boardLists}
          customLabels={state.customLabels}
          tagColors={state.tagColors}
          onClose={() => setSelectedCardId(null)}
          onUpdateCard={handleUpdateCard}
          onToggleTimer={handleToggleTimer}
          onResetTimer={handleResetTimer}
          onCompleteCard={(id) => handleCompleteCard(null, id)}
          onDeleteCard={handleDeleteCard}
          onDeleteRecurringGroup={handleDeleteRecurringGroup}
          onCreateLabel={handleCreateLabel}
          onDeleteLabel={handleDeleteLabel}
          onAddTagColor={handleAddTagColor}
          onDeleteTagColor={handleDeleteTagColor}
          onAddDayToTask={handleAddDayToTask}
        />
      )}

      {/* CLOUD SYNC & BACKUP MODAL */}
      {isCloudModalOpen && (
        <CloudSyncModal
          config={cloudConfig}
          syncStatus={syncStatus}
          state={state}
          onSaveConfig={(cfg) => {
            saveCloudConfig(cfg);
            setCloudConfig(cfg);
          }}
          onImportState={(imported) => {
            updateState(() => imported);
          }}
          onForceSync={() => {
            pushCloudState(state);
          }}
          onClose={() => setIsCloudModalOpen(false)}
        />
      )}
    </div>
  );
}
export default App;
