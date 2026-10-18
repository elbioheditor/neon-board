export type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'completed';

export type LabelColor = string;

export interface CustomLabel {
  id: string;
  name: string;
  color: string; // Hex color (e.g. '#3b82f6')
  textColor?: string;
}

export interface TagColorItem {
  id: string;
  name: string;
  hex: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskRecurrence {
  mode: 'weekdays' | 'days_count' | 'specific_days';
  weekdays?: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  daysCount?: number;  // Total consecutive days (e.g. 4)
  dayIndex?: number;   // Current day index (1..daysCount)
  specificDays?: number[]; // Days of the month (1..31)
  groupId: string;
}

export interface RecurrenceConfig {
  enabled: boolean;
  mode: 'weekdays' | 'days_count' | 'specific_days';
  weekdays: number[];
  daysCount: number;
  specificDays?: number[];
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
  labels: string[]; // Label IDs or color names
  categoryTag?: string;
  tagColor?: string; // Hex or identifier for tag color
  checklist: ChecklistItem[];
  assignee: string;
  createdAt: string;
  completedAt?: string; // ISO timestamp when marked as completed
  completedFromListTitle?: string;
  recurrence?: TaskRecurrence;
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
  owner: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
}

export type ActiveTab = 'board' | 'calendar' | 'history';

export interface UserProfile {
  id: string;
  username: string;
  friendCode: string;
  avatarColor: string;
  createdAt?: string;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
  friendProfile?: UserProfile;
}

export interface NeonStoreState {
  boards: Board[];
  activeBoardId: string;
  lists: BoardList[];
  cards: TaskCard[];
  customLabels?: CustomLabel[];
  tagColors?: TagColorItem[];
  lastUpdated: string;
}
