import {
  BoardList,
  LabelColor,
  NeonStoreState,
  RecurrenceConfig,
  TaskCard,
} from '../types';

export const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns a Date instance whose local getters (getFullYear, getMonth, getDate, getHours, getMinutes, getSeconds)
 * always represent the current official time in Brasília (America/Sao_Paulo, UTC-3),
 * regardless of the user's computer timezone setting.
 */
export function getBrasiliaNow(): Date {
  const now = new Date();
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
}

/**
 * Returns "YYYY-MM-DD" in Brasília time with a day offset (-1 = Yesterday, 0 = Today, +1 = Tomorrow).
 */
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

export function getDayAfterTomorrowIsoDate(): string {
  return getBrasiliaIsoDateWithOffset(2);
}

export function getBrasiliaYearMonth(): string {
  return getTodayIsoDate().slice(0, 7);
}

/**
 * Calculates live elapsed seconds for a task card including currently running stopwatch time.
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
 * Formats seconds into HH:MM:SS
 */
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

/**
 * Formats seconds into human-readable summary (e.g. "2h 15m 10s" or "45m 12s")
 */
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

/**
 * Converts "HH:MM" into minutes from 00:00 so morning tasks always sort before afternoon and night tasks.
 */
export function timeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 9999;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return 9999;
  return h * 60 + m;
}

export type DayPeriodKey = 'morning' | 'afternoon' | 'night';

/**
 * Determines which time-of-day color zone a task belongs to:
 * - Up to midday (startHour < 12): 'morning' (Blue)
 * - Afternoon (12:00 to 17:59): 'afternoon' (Yellowish / Golden)
 * - Night (18:00 onwards): 'night' (Dark Blue)
 */
export function getDayPeriodKey(startTime?: string): DayPeriodKey {
  if (!startTime || !startTime.includes(':')) return 'night';
  const h = parseInt(startTime.split(':')[0], 10);
  if (isNaN(h)) return 'night';
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

export const PERIOD_ZONE_STYLES: Record<
  DayPeriodKey,
  {
    listZoneClass: string;
    cardBgClass: string;
    timeBadgeClass: string;
  }
> = {
  morning: {
    // Full-bleed Blue background filling the entire list section edge-to-edge
    listZoneClass:
      'bg-gradient-to-b from-sky-500/30 via-cyan-500/25 to-sky-600/25 border-b border-cyan-400/20',
    // Semi-translucent card so the list's blue background bleeds through
    cardBgClass:
      'bg-sky-950/35 hover:bg-sky-900/45 border-cyan-300/35 hover:border-cyan-200/70 backdrop-blur-md shadow-md shadow-sky-950/40',
    timeBadgeClass:
      'bg-sky-950/65 text-cyan-200 border-cyan-400/40',
  },
  afternoon: {
    // Full-bleed Yellowish / Golden background filling the entire list section edge-to-edge
    listZoneClass:
      'bg-gradient-to-b from-yellow-400/28 via-yellow-500/22 to-amber-400/20 border-b border-yellow-300/20',
    // Semi-translucent card with warm yellowish tint
    cardBgClass:
      'bg-yellow-950/35 hover:bg-yellow-900/45 border-yellow-300/35 hover:border-yellow-200/70 backdrop-blur-md shadow-md shadow-yellow-950/40',
    timeBadgeClass:
      'bg-yellow-950/70 text-yellow-200 border-yellow-400/40',
  },
  night: {
    // Full-bleed Deep Dark Blue background filling the entire list section edge-to-edge
    listZoneClass:
      'bg-gradient-to-b from-blue-900/55 via-indigo-950/65 to-slate-950/80 border-b border-blue-500/20',
    // Semi-translucent card with dark midnight blue tint
    cardBgClass:
      'bg-blue-950/40 hover:bg-blue-900/50 border-blue-400/30 hover:border-blue-300/60 backdrop-blur-md shadow-md shadow-blue-950/60',
    timeBadgeClass:
      'bg-blue-950/75 text-blue-200 border-blue-400/40',
  },
};

/**
 * When startTime changes (e.g. from 09:00 to 11:00 while endTime was 10:00),
 * automatically sets endTime = newStartTime if newStartTime > currentEndTime.
 */
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

/**
 * When endTime changes, ensures it is not earlier than startTime.
 */
export function clampEndTime(currentStart: string, newEnd: string): string {
  if (!currentStart || !newEnd) return newEnd;
  const startMin = timeToMinutes(currentStart);
  const endMin = timeToMinutes(newEnd);
  if (startMin !== 9999 && endMin !== 9999 && endMin < startMin) {
    return currentStart;
  }
  return newEnd;
}

/**
 * Chronological comparator:
 * Sorts by startTime (Morning -> Afternoon -> Night), then by scheduledDate, then by order.
 */
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

/**
 * Formats "YYYY-MM-DD" to "Sáb, 17 Out"
 */
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

export function isStandardDateSyncedList(title: string): boolean {
  return (
    isYesterdayListTitle(title) ||
    isTodayListTitle(title) ||
    isTomorrowListTitle(title) ||
    isWeekListTitle(title)
  );
}

/**
 * Given a target scheduledDate (YYYY-MM-DD) and a board's lists,
 * returns the synchronized Board listId based on Horário de Brasília:
 * - If scheduledDate < today (overdue / atrasada) -> "Yesterday" list
 * - If scheduledDate === today -> "Today" list
 * - If scheduledDate === tomorrow -> "Tomorrow" list
 * - If scheduledDate > tomorrow -> "This Week" list
 */
export function resolveSyncedListIdForDate(
  scheduledDate: string,
  boardLists: BoardList[]
): string {
  if (boardLists.length === 0) return '';
  const todayStr = getTodayIsoDate();
  const tomorrowStr = getTomorrowIsoDate();

  const yesterdayList = boardLists.find((l) => isYesterdayListTitle(l.title));
  const todayList =
    boardLists.find((l) => isTodayListTitle(l.title)) || boardLists[0];
  const tomorrowList = boardLists.find((l) => isTomorrowListTitle(l.title));
  const weekList =
    boardLists.find((l) => isWeekListTitle(l.title)) ||
    boardLists[boardLists.length - 1];

  if (scheduledDate < todayStr) {
    return yesterdayList ? yesterdayList.id : todayList.id;
  }

  if (scheduledDate === todayStr) {
    return todayList.id;
  }

  if (scheduledDate === tomorrowStr) {
    return tomorrowList ? tomorrowList.id : weekList.id;
  }

  return weekList.id;
}

/**
 * Ensures every board has the 4 standard date-synced lists in the exact order:
 * 0: Yesterday (before Today, for overdue tasks)
 * 1: Today (for today's tasks in Brasília time)
 * 2: Tomorrow (for next day's tasks in Brasília time)
 * 3: This Week (for tasks after tomorrow)
 * And automatically moves active cards in standard lists into the right list
 * according to their scheduledDate vs current Brasília date!
 */
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

    // Ensure Yesterday is always before Today (order: Yesterday=0, Today=1, Tomorrow=2, This Week=3, custom=4+)
    const customLists = bLists
      .filter((l) => !isStandardDateSyncedList(l.title))
      .sort((a, b) => a.order - b.order);

    const desiredOrderIds = [
      yesterdayList.id,
      todayList.id,
      tomorrowList.id,
      weekList.id,
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

  // Reconcile active cards' listId based on scheduledDate in Brasília time
  const updatedCards = state.cards.map((card) => {
    if (card.status === 'completed' || !card.scheduledDate) {
      return card;
    }
    const boardLists = updatedLists.filter((l) => l.boardId === card.boardId);
    const currentList = boardLists.find((l) => l.id === card.listId);

    // Only auto-route cards that belong to standard date-synced lists (or whose list no longer exists)
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

  // Automatically extend active weekday-based recurring tasks for the next 7 days (when date > maxScheduledDate of the group)
  const todayStr = getTodayIsoDate();
  const weekdayGroups = new Map<
    string,
    { template: TaskCard; maxDate: string; weekdays: number[] }
  >();

  for (const c of updatedCards) {
    if (
      c.recurrence?.mode === 'weekdays' &&
      c.recurrence.weekdays &&
      c.recurrence.weekdays.length > 0 &&
      c.recurrence.groupId
    ) {
      const gid = c.recurrence.groupId;
      const d = c.scheduledDate || todayStr;
      const existing = weekdayGroups.get(gid);
      if (!existing) {
        weekdayGroups.set(gid, {
          template: c,
          maxDate: d,
          weekdays: c.recurrence.weekdays,
        });
      } else if (d > existing.maxDate) {
        existing.maxDate = d;
        existing.template = c;
      }
    }
  }

  weekdayGroups.forEach(({ template, maxDate, weekdays }, gid) => {
    const bLists = updatedLists.filter((l) => l.boardId === template.boardId);
    for (let offset = 0; offset < 7; offset++) {
      const targetIso = addDaysToIsoDate(todayStr, offset);
      if (targetIso > maxDate) {
        const wDay = getWeekdayFromIsoDate(targetIso);
        if (weekdays.includes(wDay)) {
          const targetListId =
            resolveSyncedListIdForDate(targetIso, bLists) || template.listId;
          updatedCards.push({
            id: `card-${Date.now()}-${gid.slice(-4)}-${offset}`,
            boardId: template.boardId,
            listId: targetListId,
            title: template.title,
            description: template.description,
            status: 'todo',
            startTime: template.startTime,
            endTime: template.endTime,
            scheduledDate: targetIso,
            elapsedSeconds: 0,
            labels: [...template.labels],
            categoryTag: template.categoryTag,
            checklist: template.checklist.map((item) => ({
              ...item,
              completed: false,
            })),
            assignee: template.assignee,
            createdAt: new Date().toISOString(),
            recurrence: {
              mode: 'weekdays',
              weekdays: [...weekdays],
              groupId: gid,
            },
            order: updatedCards.length,
          });
          cardsChanged = true;
        }
      }
    }
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

/**
 * Adds `offsetDays` to an ISO date string "YYYY-MM-DD" and returns the resulting "YYYY-MM-DD".
 */
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

/**
 * Returns the weekday index (0 = Dom, 1 = Seg, ..., 6 = Sáb) for a "YYYY-MM-DD" string.
 */
export function getWeekdayFromIsoDate(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.getDay();
}

/**
 * Builds one or multiple TaskCards according to the user's RecurrenceConfig ("Rotina").
 * - If recurrence is disabled: creates 1 card on `baseScheduledDate`.
 * - If recurrence.mode === 'days_count': creates `daysCount` cards for consecutive days starting on `baseScheduledDate`.
 * - If recurrence.mode === 'weekdays': creates cards for all matching weekdays across the next 7 days starting on `baseScheduledDate`
 *   (and `reconcileStateWithBrasiliaTime` automatically keeps rolling future weeks forward).
 */
export function buildRecurringTaskCards(params: {
  title: string;
  boardId: string;
  defaultListId: string;
  isCustomList?: boolean;
  boardLists: BoardList[];
  baseScheduledDate: string;
  startTime?: string;
  endTime?: string;
  label: LabelColor;
  categoryTag?: string;
  assignee: 'Elbioh' | 'Didi';
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
    assignee,
    baseOrder,
    recurrence,
  } = params;

  const nowTs = Date.now();
  const nowIso = new Date().toISOString();

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
        labels: [label],
        categoryTag: categoryTag || undefined,
        checklist: [],
        assignee,
        createdAt: nowIso,
        order: baseOrder,
      },
    ];
  }

  const groupId = `rec-${nowTs}`;

  // Mode 1: Consecutive days count (e.g. "4 dias" starting from baseScheduledDate)
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
        labels: [label],
        categoryTag: categoryTag || undefined,
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

  // Mode 2: Specific days of the week (0 = Dom .. 6 = Sáb)
  const selectedWeekdays =
    recurrence.weekdays && recurrence.weekdays.length > 0
      ? [...recurrence.weekdays].sort((a, b) => a - b)
      : [getWeekdayFromIsoDate(baseScheduledDate)];

  const result: TaskCard[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const dateIso = addDaysToIsoDate(baseScheduledDate, offset);
    const wDay = getWeekdayFromIsoDate(dateIso);
    if (selectedWeekdays.includes(wDay)) {
      result.push({
        id: `card-${nowTs}-w${offset}`,
        boardId,
        listId: resolveListId(dateIso),
        title,
        description: '',
        status: 'todo',
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        scheduledDate: dateIso,
        elapsedSeconds: 0,
        labels: [label],
        categoryTag: categoryTag || undefined,
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
