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
  weekdays?: number[]; // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  daysCount?: number;
  dayIndex?: number;
  specificDays?: number[]; // 1..31
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
  startTime?: string; // "09:00"
  endTime?: string;   // "10:30"
  scheduledDate?: string; // YYYY-MM-DD
  elapsedSeconds?: number; // Accumulated tracked seconds on stopwatch
  timerStartedAt?: number; // Epoch timestamp (ms) when current active timer started
  updatedAt?: number;      // Epoch timestamp (ms) of last mutation for conflict resolution
  labels: string[];
  categoryTag?: string;
  tagColor?: string;
  checklist: ChecklistItem[];
  assignee: string;
  createdAt: string;
  completedAt?: string;
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

export type ActiveTab = 'board' | 'calendar' | 'history' | 'friends';

export interface UserProfile {
  id: string;
  username: string;
  friendCode: string;
  avatarColor: string;
  email?: string;
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

export interface UserBoardPayload {
  board: Board;
  boards?: Board[];
  lists: BoardList[];
  cards: TaskCard[];
  customLabels?: CustomLabel[];
  tagColors?: TagColorItem[];
}

/**
 * Platform-agnostic asynchronous key-value storage contract.
 * Desktop implements this with window.localStorage; Mobile with AsyncStorage / SecureStore.
 */
export interface PlatformStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
