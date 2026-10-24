import {
  BoardList,
  LabelColor,
  NeonStoreState,
  RecurrenceConfig,
  TaskCard,
} from './types';

export const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns a Date instance whose local getters represent the current time in Brasília (UTC-3).
 */
export function getBrasiliaNow(): Date {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BRASILIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = parseInt(p.value, 10);
      }
    }
    const hour = map.hour === 24 ? 0 : map.hour || 0;
    return new Date(
      map.year || now.getFullYear(),
      (map.month || 1) - 1,
      map.day || 1,
      hour,
      map.minute || 0,
      map.second || 0
    );
  } catch {
    return now;
  }
}

export function getBrasiliaIsoDateWithOffset(offsetDays: number): string {
  const br = getBrasiliaNow();
  br.setDate(br.getDate() + offsetDays);
  const y = br.getFullYear();
  const m = String(br.getMonth() + 1).padStart(2, '0');
  const d = String(br.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayIsoDate(): string {
  return getBrasiliaIsoDateWithOffset(-1);
}

export function getTodayIsoDate(): string {
  return getBrasiliaIsoDateWithOffset(0);
}

export function getTomorrowIsoDate(): string {
  return getBrasiliaIsoDateWithOffset(1);
}

export function getBrasiliaYearMonth(): string {
  return getTodayIsoDate().slice(0, 7);
}

/**
 * Deterministic stopwatch calculation:
 * Calculates live elapsed seconds from persisted timestamps without requiring background loops.
 * elapsed = accumulatedPausedSeconds + floor((nowMs - timerStartedAt) / 1000)
 */
export function getLiveElapsedSeconds(card: TaskCard, nowMs: number): number {
  const base = card.elapsedSeconds || 0;
  if (card.status === 'in_progress' && card.timerStartedAt) {
    const delta = Math.max(0, Math.floor((nowMs - card.timerStartedAt) / 1000));
    return base + delta;
  }
  return base;
}

/**
 * Pure state transition for toggling a card's stopwatch on any device.
 */
export function toggleCardTimerState(card: TaskCard, nowMs: number): TaskCard {
  if (card.status === 'in_progress') {
    const totalElapsed = getLiveElapsedSeconds(card, nowMs);
    return {
      ...card,
      status: 'paused',
      elapsedSeconds: totalElapsed,
      timerStartedAt: undefined,
      updatedAt: nowMs,
    };
  }
  return {
    ...card,
    status: 'in_progress',
    timerStartedAt: nowMs,
    updatedAt: nowMs,
  };
}

export function formatStopwatch(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

export function formatDurationHuman(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  if (secs === 0) return '0m 00s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function timeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 9999;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return 9999;
  return h * 60 + m;
}

export type DayPeriodKey = 'morning' | 'afternoon' | 'night';

export function getDayPeriodKey(startTime?: string): DayPeriodKey {
  if (!startTime || !startTime.includes(':')) return 'night';
  const h = parseInt(startTime.split(':')[0], 10);
  if (isNaN(h)) return 'night';
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

export function syncEndTimeWithStart(newStart: string, currentEnd: string): string {
  if (!newStart) return currentEnd;
  if (!currentEnd) return newStart;
  const startMin = timeToMinutes(newStart);
  const endMin = timeToMinutes(currentEnd);
  if (startMin !== 9999 && endMin !== 9999 && startMin > endMin) {
    return newStart;
  }
  return currentEnd;
}

export function clampEndTime(currentStart: string, newEnd: string): string {
  if (!currentStart || !newEnd) return newEnd;
  const startMin = timeToMinutes(currentStart);
  const endMin = timeToMinutes(newEnd);
  if (startMin !== 9999 && endMin !== 9999 && endMin < startMin) {
    return currentStart;
  }
  return newEnd;
}

export function compareCardsByTimeOfDay(a: TaskCard, b: TaskCard): number {
  const minA = timeToMinutes(a.startTime);
  const minB = timeToMinutes(b.startTime);
  if (minA !== minB) {
    return minA - minB;
  }
  const dateA = a.scheduledDate || '9999-99-99';
  const dateB = b.scheduledDate || '9999-99-99';
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  return a.order - b.order;
}

export function formatShortDatePt(isoDate?: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, d);
  if (isNaN(dateObj.getTime())) return isoDate;

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  return `${weekdays[dateObj.getDay()]}, ${String(d).padStart(2, '0')} ${months[m]}`;
}

export function isYesterdayListTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return lower.includes('yesterday') || lower.includes('ontem');
}

export function isTodayListTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return lower.includes('today') || lower.includes('hoje');
}

export function isTomorrowListTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return (
    lower.includes('tomorrow') ||
    lower.includes('amanhã') ||
    lower.includes('amanha')
  );
}

export function isWeekListTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return lower.includes('week') || lower.includes('semana');
}

export function isFutureListTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return lower.includes('future') || lower.includes('futuro');
}

export function isStandardDateSyncedList(title: string): boolean {
  return (
    isYesterdayListTitle(title) ||
    isTodayListTitle(title) ||
    isTomorrowListTitle(title) ||
    isWeekListTitle(title) ||
    isFutureListTitle(title)
  );
}

export function getEndOfWeekIsoDate(): string {
  const br = getBrasiliaNow();
  const day = br.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return getBrasiliaIsoDateWithOffset(daysUntilSunday);
}

export function resolveSyncedListIdForDate(
  scheduledDate: string,
  boardLists: BoardList[]
): string {
  if (boardLists.length === 0) return '';
  const todayStr = getTodayIsoDate();
  const tomorrowStr = getTomorrowIsoDate();
  const endOfWeekStr = getEndOfWeekIsoDate();

  const yesterdayList = boardLists.find((l) => isYesterdayListTitle(l.title));
  const todayList =
    boardLists.find((l) => isTodayListTitle(l.title)) || boardLists[0];
  const tomorrowList = boardLists.find((l) => isTomorrowListTitle(l.title));
  const weekList =
    boardLists.find((l) => isWeekListTitle(l.title)) ||
    boardLists[boardLists.length - 1];
  const futureList = boardLists.find((l) => isFutureListTitle(l.title));

  if (scheduledDate < todayStr) {
    return yesterdayList ? yesterdayList.id : todayList.id;
  }
  if (scheduledDate === todayStr) {
    return todayList.id;
  }
  if (scheduledDate === tomorrowStr) {
    return tomorrowList ? tomorrowList.id : weekList.id;
  }
  if (scheduledDate <= endOfWeekStr) {
    return weekList.id;
  }
  return futureList ? futureList.id : weekList.id;
}

export function addDaysToIsoDate(baseIso: string, offsetDays: number): string {
  const parts = baseIso.split('-').map(Number);
  if (parts.length !== 3) return baseIso;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + offsetDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekdayFromIsoDate(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.getDay();
}

export function reconcileStateWithBrasiliaTime(
  state: NeonStoreState
): NeonStoreState {
  let listsChanged = false;
  let cardsChanged = false;

  const updatedLists: BoardList[] = [...state.lists];

  for (const board of state.boards) {
    const bLists = updatedLists.filter((l) => l.boardId === board.id);

    let yesterdayList = bLists.find((l) => isYesterdayListTitle(l.title));
    let todayList = bLists.find((l) => isTodayListTitle(l.title));
    let tomorrowList = bLists.find((l) => isTomorrowListTitle(l.title));
    let weekList = bLists.find((l) => isWeekListTitle(l.title));
    let futureList = bLists.find((l) => isFutureListTitle(l.title));

    if (!yesterdayList) {
      yesterdayList = {
        id: `${board.id}-yesterday`,
        boardId: board.id,
        title: 'Yesterday',
        order: 0,
      };
      updatedLists.push(yesterdayList);
      bLists.push(yesterdayList);
      listsChanged = true;
    }

    if (!todayList) {
      todayList = {
        id: `${board.id}-today`,
        boardId: board.id,
        title: 'Today',
        order: 1,
      };
      updatedLists.push(todayList);
      bLists.push(todayList);
      listsChanged = true;
    }

    if (!tomorrowList) {
      tomorrowList = {
        id: `${board.id}-tomorrow`,
        boardId: board.id,
        title: 'Tomorrow',
        order: 2,
      };
      updatedLists.push(tomorrowList);
      bLists.push(tomorrowList);
      listsChanged = true;
    }

    if (!weekList) {
      weekList = {
        id: `${board.id}-week`,
        boardId: board.id,
        title: 'This Week',
        order: 3,
      };
      updatedLists.push(weekList);
      bLists.push(weekList);
      listsChanged = true;
    }

    if (!futureList) {
      futureList = {
        id: `${board.id}-future`,
        boardId: board.id,
        title: 'Future',
        order: 4,
      };
      updatedLists.push(futureList);
      bLists.push(futureList);
      listsChanged = true;
    }

    const customLists = bLists
      .filter((l) => !isStandardDateSyncedList(l.title))
      .sort((a, b) => a.order - b.order);

    const desiredOrderIds = [
      yesterdayList.id,
      todayList.id,
      tomorrowList.id,
      weekList.id,
      futureList.id,
      ...customLists.map((l) => l.id),
    ];

    desiredOrderIds.forEach((id, idx) => {
      const target = updatedLists.find((l) => l.id === id);
      if (target && target.order !== idx) {
        target.order = idx;
        listsChanged = true;
      }
    });
  }

  const updatedCards = state.cards.map((card) => {
    if (card.status === 'completed' || !card.scheduledDate) {
      return card;
    }
    const boardLists = updatedLists.filter((l) => l.boardId === card.boardId);
    const currentList = boardLists.find((l) => l.id === card.listId);

    if (currentList && !isStandardDateSyncedList(currentList.title)) {
      return card;
    }

    const expectedListId = resolveSyncedListIdForDate(
      card.scheduledDate,
      boardLists
    );
    if (expectedListId && card.listId !== expectedListId) {
      cardsChanged = true;
      return {
        ...card,
        listId: expectedListId,
      };
    }
    return card;
  });

  if (!listsChanged && !cardsChanged) {
    return state;
  }

  return {
    ...state,
    lists: updatedLists,
    cards: updatedCards,
  };
}

export function buildRecurringTaskCards(params: {
  title: string;
  boardId: string;
  defaultListId: string;
  isCustomList?: boolean;
  boardLists: BoardList[];
  baseScheduledDate: string;
  startTime?: string;
  endTime?: string;
  label: LabelColor | string | string[];
  categoryTag?: string;
  tagColor?: string;
  assignee: string;
  baseOrder: number;
  recurrence?: RecurrenceConfig;
}): TaskCard[] {
  const {
    title,
    boardId,
    defaultListId,
    isCustomList = false,
    boardLists,
    baseScheduledDate,
    startTime,
    endTime,
    label,
    categoryTag,
    tagColor,
    assignee,
    baseOrder,
    recurrence,
  } = params;

  const nowTs = Date.now();
  const nowIso = new Date().toISOString();
  const cardLabels = Array.isArray(label) ? label : [label];

  const resolveListId = (dateIso: string) =>
    isCustomList
      ? defaultListId
      : resolveSyncedListIdForDate(dateIso, boardLists) || defaultListId;

  if (!recurrence || !recurrence.enabled) {
    return [
      {
        id: `card-${nowTs}`,
        boardId,
        listId: resolveListId(baseScheduledDate),
        title,
        description: '',
        status: 'todo',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduledDate: baseScheduledDate,
        elapsedSeconds: 0,
        updatedAt: nowTs,
        labels: cardLabels,
        categoryTag: categoryTag || undefined,
        tagColor: tagColor || undefined,
        checklist: [],
        assignee,
        createdAt: nowIso,
        order: baseOrder,
      },
    ];
  }

  const groupId = `rec-${nowTs}`;

  if (recurrence.mode === 'days_count') {
    const count = Math.max(1, Math.min(60, recurrence.daysCount || 1));
    const result: TaskCard[] = [];
    for (let i = 0; i < count; i++) {
      const dateIso = addDaysToIsoDate(baseScheduledDate, i);
      result.push({
        id: `card-${nowTs}-${i}`,
        boardId,
        listId: resolveListId(dateIso),
        title,
        description: '',
        status: 'todo',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduledDate: dateIso,
        elapsedSeconds: 0,
        updatedAt: nowTs,
        labels: cardLabels,
        categoryTag: categoryTag || undefined,
        tagColor: tagColor || undefined,
        checklist: [],
        assignee,
        createdAt: nowIso,
        recurrence: {
          mode: 'days_count',
          daysCount: count,
          dayIndex: i + 1,
          groupId,
        },
        order: baseOrder + i,
      });
    }
    return result;
  }

  if (recurrence.mode === 'specific_days') {
    const [y, m, d] = baseScheduledDate.split('-').map(Number);
    const baseDayNum = d || 1;
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const rawDays =
      recurrence.specificDays && recurrence.specificDays.length > 0
        ? recurrence.specificDays
        : [baseDayNum];
    const filteredDays = rawDays
      .filter((dayNum) => dayNum >= baseDayNum && dayNum <= totalDaysInMonth)
      .sort((a, b) => a - b);
    const days = filteredDays.length > 0 ? filteredDays : [baseDayNum];
    const totalParts = days.length;
    const result: TaskCard[] = [];

    days.forEach((dayNum, idx) => {
      const dateIso = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      result.push({
        id: `card-${nowTs}-spec${dayNum}`,
        boardId,
        listId: resolveListId(dateIso),
        title,
        description: '',
        status: 'todo',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduledDate: dateIso,
        elapsedSeconds: 0,
        updatedAt: nowTs,
        labels: cardLabels,
        categoryTag: categoryTag || undefined,
        tagColor: tagColor || undefined,
        checklist: [],
        assignee,
        createdAt: nowIso,
        recurrence: {
          mode: 'specific_days',
          specificDays: days,
          daysCount: totalParts,
          dayIndex: idx + 1,
          groupId,
        },
        order: baseOrder + idx,
      });
    });
    return result;
  }

  const selectedWeekdays =
    recurrence.weekdays && recurrence.weekdays.length > 0
      ? [...recurrence.weekdays].sort((a, b) => a - b)
      : [getWeekdayFromIsoDate(baseScheduledDate)];

  const [y, m, d] = baseScheduledDate.split('-').map(Number);
  const baseDayNum = d || 1;
  const totalDaysInMonth = new Date(y, m, 0).getDate();
  const result: TaskCard[] = [];

  for (let dayNum = baseDayNum; dayNum <= totalDaysInMonth; dayNum++) {
    const dateIso = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const wDay = getWeekdayFromIsoDate(dateIso);
    if (selectedWeekdays.includes(wDay)) {
      result.push({
        id: `card-${nowTs}-w${dayNum}`,
        boardId,
        listId: resolveListId(dateIso),
        title,
        description: '',
        status: 'todo',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduledDate: dateIso,
        elapsedSeconds: 0,
        updatedAt: nowTs,
        labels: cardLabels,
        categoryTag: categoryTag || undefined,
        tagColor: tagColor || undefined,
        checklist: [],
        assignee,
        createdAt: nowIso,
        recurrence: {
          mode: 'weekdays',
          weekdays: selectedWeekdays,
          groupId,
        },
        order: baseOrder + result.length,
      });
    }
  }

  return result;
}
