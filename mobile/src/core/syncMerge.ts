import {
  Board,
  BoardList,
  TaskCard,
  UserBoardPayload,
} from './types';
import {
  DEFAULT_CUSTOM_LABELS,
  DEFAULT_TAG_COLORS,
} from './labelsAndColors';
import {
  addDaysToIsoDate,
  getTodayIsoDate,
  getTomorrowIsoDate,
  getYesterdayIsoDate,
} from './timeUtils';

/**
 * Resolves conflicts between two sets of cards (e.g. Local Mobile vs Cloud PC)
 * on a per-card basis using `updatedAt` (Last-Write-Wins), ensuring that an older
 * full-board payload never overwrites a newer stopwatch state or task edit.
 */
export function mergeCardsByTimestamp(
  localCards: TaskCard[],
  remoteCards: TaskCard[],
  preferRemoteForDeletions: boolean = true
): TaskCard[] {
  const localMap = new Map<string, TaskCard>();
  for (const c of localCards) {
    localMap.set(c.id, c);
  }

  const remoteMap = new Map<string, TaskCard>();
  for (const c of remoteCards) {
    remoteMap.set(c.id, c);
  }

  const merged: TaskCard[] = [];
  const seenIds = new Set<string>();

  for (const remoteCard of remoteCards) {
    seenIds.add(remoteCard.id);
    const localCard = localMap.get(remoteCard.id);
    if (!localCard) {
      merged.push(remoteCard);
      continue;
    }

    const localTs = localCard.updatedAt || 0;
    const remoteTs = remoteCard.updatedAt || 0;

    if (localTs > remoteTs) {
      merged.push(localCard);
    } else {
      merged.push(remoteCard);
    }
  }

  if (!preferRemoteForDeletions) {
    for (const localCard of localCards) {
      if (!seenIds.has(localCard.id)) {
        merged.push(localCard);
      }
    }
  }

  return merged;
}

export function generateFriendCode(username: string): string {
  const clean =
    username
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'NEON';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${clean}#${rand}`;
}

export function usernameToAuthEmail(username: string): string {
  const clean = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@neon.app`;
}

export function getUserInitials(name?: string): string {
  if (!name) return 'U';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function createNewUserBoardState(username: string): UserBoardPayload {
  const nowTs = Date.now();
  const boardId = `board-${nowTs}`;
  const yesterdayListId = `list-${boardId}-yesterday`;
  const todayListId = `list-${boardId}-today`;
  const tomorrowListId = `list-${boardId}-tomorrow`;
  const weekListId = `list-${boardId}-week`;
  const futureListId = `list-${boardId}-future`;

  const lists: BoardList[] = [
    { id: yesterdayListId, boardId, title: 'Yesterday', order: 0 },
    { id: todayListId, boardId, title: 'Today', order: 1 },
    { id: tomorrowListId, boardId, title: 'Tomorrow', order: 2 },
    { id: weekListId, boardId, title: 'This Week', order: 3 },
    { id: futureListId, boardId, title: 'Future', order: 4 },
  ];

  const cards: TaskCard[] = [
    {
      id: `card-${nowTs}-1`,
      boardId,
      listId: yesterdayListId,
      title: 'Aqui ficam as tarefas atrasadas',
      description:
        'Tarefas não concluídas descem para cá automaticamente pelo fuso de Brasília.',
      status: 'todo',
      startTime: '09:00',
      endTime: '10:00',
      scheduledDate: getYesterdayIsoDate(),
      updatedAt: nowTs,
      labels: ['lbl-red'],
      categoryTag: 'ATRASADA',
      tagColor: '#ef4444',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${nowTs}-2`,
      boardId,
      listId: todayListId,
      title: 'Aqui é o q tu tem q fazer hoje caraio',
      description:
        'Comece organizando suas prioridades de hoje e inicie o cronômetro!',
      status: 'todo',
      startTime: '10:00',
      endTime: '11:00',
      scheduledDate: getTodayIsoDate(),
      updatedAt: nowTs,
      labels: ['lbl-yellow'],
      categoryTag: 'HOJE',
      tagColor: '#06b6d4',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${nowTs}-3`,
      boardId,
      listId: tomorrowListId,
      title: 'Amanha jaja é hoje pae',
      description:
        'Planejamento de amanhã. À meia-noite vira Today automaticamente!',
      status: 'todo',
      startTime: '11:00',
      endTime: '12:00',
      scheduledDate: getTomorrowIsoDate(),
      updatedAt: nowTs,
      labels: ['lbl-blue'],
      categoryTag: 'AMANHÃ',
      tagColor: '#3b82f6',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${nowTs}-4`,
      boardId,
      listId: weekListId,
      title: 'Semaninha cheia?',
      description: 'Distribua suas demandas ao longo dos próximos dias.',
      status: 'todo',
      startTime: '14:00',
      endTime: '15:00',
      scheduledDate: addDaysToIsoDate(getTodayIsoDate(), 3),
      updatedAt: nowTs,
      labels: ['lbl-blue'],
      categoryTag: 'SEMANA',
      tagColor: '#a855f7',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${nowTs}-5`,
      boardId,
      listId: futureListId,
      title: 'Se bobear jájá chega',
      description: 'Backlog e planos futuros para não esquecer de nada.',
      status: 'todo',
      startTime: '16:00',
      endTime: '17:00',
      scheduledDate: addDaysToIsoDate(getTodayIsoDate(), 7),
      updatedAt: nowTs,
      labels: ['lbl-blue'],
      categoryTag: 'FUTURO',
      tagColor: '#10b981',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
  ];

  const board: Board = {
    id: boardId,
    name: `${username}'s Board`,
    owner: username,
    subtitle: 'Board Pessoal',
    accentFrom: '#06b6d4',
    accentTo: '#a855f7',
  };

  return {
    board,
    boards: [board],
    lists,
    cards,
    customLabels: DEFAULT_CUSTOM_LABELS,
    tagColors: DEFAULT_TAG_COLORS,
  };
}
