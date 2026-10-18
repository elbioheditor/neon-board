import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, getSavedCloudConfig } from './cloudSync';
import { UserProfile, Friendship, Board, BoardList, TaskCard, CustomLabel, TagColorItem } from '../types';
import { DEFAULT_CUSTOM_LABELS, DEFAULT_TAG_COLORS } from '../data/initialData';
import { getYesterdayIsoDate, getTodayIsoDate, addDaysToIsoDate } from '../utils/timeUtils';

let authClient: SupabaseClient | null = null;

export function getSupabaseAuthClient(): SupabaseClient {
  if (!authClient) {
    const cfg = getSavedCloudConfig();
    const url = (cfg.supabaseUrl || DEFAULT_SUPABASE_URL).trim();
    const key = (cfg.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY).trim();
    authClient = createClient(url, key);
  }
  return authClient;
}

export function generateFriendCode(username: string): string {
  const clean = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'NEON';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${clean}#${rand}`;
}

export async function signUpUser(
  email: string,
  pass: string,
  username: string,
  avatarColor: string = '#a855f7'
): Promise<{ user: User | null; profile: UserProfile | null; error?: string }> {
  const client = getSupabaseAuthClient();
  const trimmedEmail = email.trim();
  const trimmedName = username.trim() || 'Usuário';

  const { data, error } = await client.auth.signUp({
    email: trimmedEmail,
    password: pass,
  });

  if (error) {
    return { user: null, profile: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, profile: null, error: 'Não foi possível criar o usuário.' };
  }

  const friendCode = generateFriendCode(trimmedName);
  const profile: UserProfile = {
    id: data.user.id,
    username: trimmedName,
    friendCode,
    avatarColor,
    createdAt: new Date().toISOString(),
  };

  const { error: profError } = await client.from('profiles').upsert({
    id: data.user.id,
    username: profile.username,
    friend_code: profile.friendCode,
    avatar_color: profile.avatarColor,
  });

  if (profError) {
    console.error('Erro ao salvar perfil no Supabase:', profError);
  }

  return { user: data.user, profile };
}

export async function signInUser(
  email: string,
  pass: string
): Promise<{ user: User | null; profile: UserProfile | null; error?: string }> {
  const client = getSupabaseAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error) {
    return { user: null, profile: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, profile: null, error: 'Usuário não encontrado.' };
  }

  const profile = await fetchUserProfile(data.user.id);
  return { user: data.user, profile };
}

export async function signOutUser(): Promise<void> {
  const client = getSupabaseAuthClient();
  await client.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseAuthClient();
  const { data } = await client.auth.getUser();
  return data.user || null;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseAuthClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, username, friend_code, avatar_color, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    friendCode: data.friend_code,
    avatarColor: data.avatar_color,
    createdAt: data.created_at,
  };
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const client = getSupabaseAuthClient();
  const { data, error } = await client
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error || !data) return [];

  const otherIds = data.map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
  if (otherIds.length === 0) return [];

  const { data: profs } = await client
    .from('profiles')
    .select('id, username, friend_code, avatar_color')
    .in('id', otherIds);

  const profMap = new Map<string, UserProfile>();
  if (profs) {
    profs.forEach((p) => {
      profMap.set(p.id, {
        id: p.id,
        username: p.username,
        friendCode: p.friend_code,
        avatarColor: p.avatar_color,
      });
    });
  }

  return data.map((row) => {
    const friendId = row.user_id === userId ? row.friend_id : row.user_id;
    return {
      id: row.id,
      userId: row.user_id,
      friendId: row.friend_id,
      status: row.status,
      createdAt: row.created_at,
      friendProfile: profMap.get(friendId),
    };
  });
}

export async function sendFriendRequest(
  userId: string,
  rawFriendCode: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseAuthClient();
  const code = rawFriendCode.trim().toUpperCase();

  if (!code) {
    return { success: false, message: 'Digite um código de amigo válido.' };
  }

  const { data: targetProfile, error: searchError } = await client
    .from('profiles')
    .select('id, username, friend_code')
    .eq('friend_code', code)
    .single();

  if (searchError || !targetProfile) {
    return { success: false, message: 'Nenhum usuário encontrado com esse código.' };
  }

  if (targetProfile.id === userId) {
    return { success: false, message: 'Você não pode adicionar a si mesmo como amigo.' };
  }

  // Verifica se já existe amizade ou pedido pendente
  const { data: existing } = await client
    .from('friendships')
    .select('id, status')
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userId})`
    );

  if (existing && existing.length > 0) {
    const status = existing[0].status;
    if (status === 'accepted') {
      return { success: false, message: `Você e ${targetProfile.username} já são amigos!` };
    }
    return { success: false, message: 'Já existe um pedido de amizade pendente.' };
  }

  const { error: insertError } = await client.from('friendships').insert({
    user_id: userId,
    friend_id: targetProfile.id,
    status: 'pending',
  });

  if (insertError) {
    return { success: false, message: `Erro ao enviar solicitação: ${insertError.message}` };
  }

  return { success: true, message: `Solicitação enviada com sucesso para ${targetProfile.username}!` };
}

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseAuthClient();
  if (accept) {
    const { error } = await client
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } else {
    const { error } = await client
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}

export interface UserBoardPayload {
  board: Board;
  boards?: Board[];
  lists: BoardList[];
  cards: TaskCard[];
  customLabels?: CustomLabel[];
  tagColors?: TagColorItem[];
}

export async function fetchUserAndFriendsBoards(
  userId: string,
  acceptedFriendIds: string[]
): Promise<{ ownerBoard: UserBoardPayload | null; friendsBoards: UserBoardPayload[] }> {
  const client = getSupabaseAuthClient();
  const allIds = [userId, ...acceptedFriendIds];

  const { data, error } = await client
    .from('user_boards')
    .select('id, owner_id, name, board_state, updated_at')
    .in('owner_id', allIds);

  if (error || !data) {
    return { ownerBoard: null, friendsBoards: [] };
  }

  let ownerBoard: UserBoardPayload | null = null;
  const friendsBoards: UserBoardPayload[] = [];

  for (const row of data) {
    const state = row.board_state as UserBoardPayload;
    if (!state || !state.board) continue;

    if (row.owner_id === userId) {
      ownerBoard = state;
    } else {
      friendsBoards.push(state);
    }
  }

  return { ownerBoard, friendsBoards };
}

export async function saveUserBoardToCloud(
  userId: string,
  payload: UserBoardPayload
): Promise<boolean> {
  const client = getSupabaseAuthClient();
  const { error } = await client.from('user_boards').upsert(
    {
      owner_id: userId,
      name: payload.board.name,
      board_state: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id' }
  );

  if (error) {
    console.error('Erro ao salvar board no Supabase:', error);
    return false;
  }
  return true;
}

export function createNewUserBoardState(username: string): UserBoardPayload {
  const boardId = `board-${Date.now()}`;
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
      id: `card-${Date.now()}-1`,
      boardId,
      listId: yesterdayListId,
      title: 'tarefa atrasada teste',
      description: 'Tarefa de exemplo atrasada.',
      status: 'todo',
      startTime: '09:00',
      endTime: '10:00',
      scheduledDate: getYesterdayIsoDate(),
      labels: ['lbl-red'],
      categoryTag: 'ATRASADA',
      tagColor: '#ef4444',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${Date.now()}-2`,
      boardId,
      listId: todayListId,
      title: 'aprenda a usar o app caraio',
      description: 'Comece organizando suas prioridades de hoje e inicie o cronômetro!',
      status: 'todo',
      startTime: '10:00',
      endTime: '11:00',
      scheduledDate: getTodayIsoDate(),
      labels: ['lbl-yellow'],
      categoryTag: 'TUTORIAL',
      tagColor: '#06b6d4',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
    {
      id: `card-${Date.now()}-3`,
      boardId,
      listId: weekListId,
      title: 'se bobera chega',
      description: 'Planejamento para os próximos dias.',
      status: 'todo',
      startTime: '14:00',
      endTime: '15:00',
      scheduledDate: addDaysToIsoDate(getTodayIsoDate(), 4),
      labels: ['lbl-blue'],
      categoryTag: 'PLANEJAMENTO',
      tagColor: '#a855f7',
      checklist: [],
      assignee: username,
      createdAt: new Date().toISOString(),
      order: 0,
    },
  ];

  return {
    board: {
      id: boardId,
      name: `${username}'s Board`,
      owner: username,
      subtitle: 'Board Pessoal',
      accentFrom: 'from-cyan-500',
      accentTo: 'to-purple-600',
    },
    lists,
    cards,
    customLabels: DEFAULT_CUSTOM_LABELS,
    tagColors: DEFAULT_TAG_COLORS,
  };
}
