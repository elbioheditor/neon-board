export type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'completed';

export type LabelColor = 'purple' | 'cyan' | 'pink' | 'green' | 'yellow' | 'orange';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskCard {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  status: TaskStatus;
  startTime?: string; // e.g. "09:00"
  endTime?: string;   // e.g. "10:30"
  scheduledDate?: string; // YYYY-MM-DD
  elapsedSeconds?: number; // Accumulated tracked seconds on stopwatch
  timerStartedAt?: number; // Timestamp (ms) when current active timer started
  labels: LabelColor[];
  categoryTag?: string;
  checklist: ChecklistItem[];
  assignee: 'Elbioh' | 'Didi';
  createdAt: string;
  completedAt?: string; // ISO timestamp when marked as completed
  completedFromListTitle?: string;
  order: number;
}

export interface BoardList {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  name: string;
  owner: 'Elbioh' | 'Didi';
  subtitle: string;
  accentFrom: string;
  accentTo: string;
}

export type ActiveTab = 'board' | 'calendar' | 'history';

export interface NeonStoreState {
  boards: Board[];
  activeBoardId: string;
  lists: BoardList[];
  cards: TaskCard[];
  lastUpdated: string;
}
