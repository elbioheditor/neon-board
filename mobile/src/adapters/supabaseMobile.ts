import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import {
  Friendship,
  PlatformStorageAdapter,
  UserBoardPayload,
  UserProfile,
} from '../core/types';
import {
  generateFriendCode,
  usernameToAuthEmail,
} from '../core/syncMerge';

export const DEFAULT_SUPABASE_URL = 'https://adiqvvqfwbtxgrohkaop.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_u2gBRJWzAYN2AlnlPi7XXg_ffkwU1dA';

const REMEMBER_ME_STORAGE_KEY = 'neon_mobile_remember_me_until';
const LOCAL_BOARD_STORAGE_PREFIX = 'neon_mobile_board_state_v1_';

/**
 * Native Mobile Storage Adapter implementing PlatformStorageAdapter via AsyncStorage.
 */
export const mobileStorageAdapter: PlatformStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Mobile storage setItem error:', e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Mobile storage removeItem error:', e);
    }
  },
};

export async function saveLocalBoardState(userId: string, stateJson: string): Promise<void> {
  await mobileStorageAdapter.setItem(`${LOCAL_BOARD_STORAGE_PREFIX}${userId}`, stateJson);
}

export async function loadLocalBoardState(userId: string): Promise<string | null> {
  return await mobileStorageAdapter.getItem(`${LOCAL_BOARD_STORAGE_PREFIX}${userId}`);
}

export async function setRememberMePreference(remember60Days: boolean): Promise<void> {
  if (remember60Days) {
    const expireAt = Date.now() + 60 * 24 * 60 * 60 * 1000;
    await mobileStorageAdapter.setItem(REMEMBER_ME_STORAGE_KEY, expireAt.toString());
  } else {
    await mobileStorageAdapter.setItem(REMEMBER_ME_STORAGE_KEY, 'session');
  }
}

export async function isRememberMeExpired(): Promise<boolean> {
  const val = await mobileStorageAdapter.getItem(REMEMBER_ME_STORAGE_KEY);
  if (!val || val === 'session') return false;
  const expireMs = Number(val);
  if (!isNaN(expireMs) && Date.now() > expireMs) {
    return true;
  }
  return false;
}

let supabaseClient: SupabaseClient | null = null;
let appStateSubscriptionConfigured = false;

export function getSupabaseMobileClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'neon_mobile_supabase_auth_token_v1',
      },
    });

    if (!appStateSubscriptionConfigured) {
      appStateSubscriptionConfigured = true;
      AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active') {
          supabaseClient?.auth.startAutoRefresh();
        } else {
          supabaseClient?.auth.stopAutoRefresh();
        }
      });
    }
  }
  return supabaseClient;
}

export async function upsertProfileSafely(
  client: SupabaseClient,
  payload: {
    id: string;
    username: string;
    friendCode: string;
    avatarColor: string;
    email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const basePayload: Record<string, unknown> = {
    id: payload.id,
    username: payload.username,
    friend_code: payload.friendCode,
    avatar_color: payload.avatarColor,
  };

  if (payload.email) {
    try {
      const { error: errWithEmail } = await client.from('profiles').upsert({
        ...basePayload,
        email: payload.email,
      });
      if (!errWithEmail) {
        return { success: true };
      }
      if (errWithEmail.code === '23505') {
        const detail = (errWithEmail.details || errWithEmail.message || '').toLowerCase();
        if (detail.includes('username')) {
          return {
            success: false,
            error: `O nome de usuário "${payload.username}" já está em uso.`,
          };
        }
        if (detail.includes('email')) {
          return {
            success: false,
            error: `O e-mail "${payload.email}" já está cadastrado.`,
          };
        }
        return {
          success: false,
          error: 'Este nome de usuário ou e-mail já está em uso.',
        };
      }
    } catch {
      // fallback to basePayload
    }
  }

  try {
    const { error: baseErr } = await client.from('profiles').upsert(basePayload);
    if (baseErr) {
      if (baseErr.code === '23505') {
        return {
          success: false,
          error: `O nome de usuário "${payload.username}" já está em uso.`,
        };
      }
      return { success: false, error: baseErr.message };
    }
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha ao salvar perfil.';
    return { success: false, error: msg };
  }
}

export async function signUpUserMobile(
  username: string,
  pass: string,
  email: string,
  avatarColor: string = '#a855f7'
): Promise<{ user: User | null; profile: UserProfile | null; error?: string }> {
  const client = getSupabaseMobileClient();
  const trimmedName = username.trim() || 'Usuário';
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return {
      user: null,
      profile: null,
      error: 'Por favor, informe um e-mail válido.',
    };
  }

  try {
    const { data: existingNick } = await client
      .from('profiles')
      .select('id, username')
      .ilike('username', trimmedName)
      .maybeSingle();

    if (existingNick) {
      return {
        user: null,
        profile: null,
        error: `O nome de usuário "${trimmedName}" já está em uso.`,
      };
    }
  } catch {
    // ignore
  }

  try {
    const { data: existingEmail } = await client
      .from('profiles')
      .select('id, email')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (existingEmail) {
      return {
        user: null,
        profile: null,
        error: `O e-mail "${trimmedEmail}" já está cadastrado. Use a aba "Entrar"!`,
      };
    }
  } catch {
    // ignore
  }

  const { data, error } = await client.auth.signUp({
    email: trimmedEmail,
    password: pass,
    options: {
      data: {
        username: trimmedName,
        avatar_color: avatarColor,
      },
    },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('user already exists')
    ) {
      return {
        user: null,
        profile: null,
        error: `O e-mail "${trimmedEmail}" já está cadastrado. Use a aba "Entrar"!`,
      };
    }
    return { user: null, profile: null, error: error.message };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      user: null,
      profile: null,
      error: `O e-mail "${trimmedEmail}" já está cadastrado. Use a aba "Entrar"!`,
    };
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
    email: trimmedEmail,
    createdAt: new Date().toISOString(),
  };

  const profResult = await upsertProfileSafely(client, {
    id: profile.id,
    username: profile.username,
    friendCode: profile.friendCode,
    avatarColor: profile.avatarColor,
    email: trimmedEmail,
  });

  if (!profResult.success) {
    return {
      user: null,
      profile: null,
      error: profResult.error || 'Não foi possível registrar esse usuário.',
    };
  }

  return { user: data.user, profile };
}

export async function signInUserMobile(
  usernameOrEmail: string,
  pass: string
): Promise<{ user: User | null; profile: UserProfile | null; error?: string }> {
  const client = getSupabaseMobileClient();
  const input = usernameOrEmail.trim();
  let targetEmail = input;

  if (!input.includes('@')) {
    try {
      const { data: prof } = await client
        .from('profiles')
        .select('id, email, username')
        .ilike('username', input)
        .maybeSingle();

      if (prof?.email) {
        targetEmail = prof.email;
      } else {
        targetEmail = usernameToAuthEmail(input);
      }
    } catch {
      targetEmail = usernameToAuthEmail(input);
    }
  }

  let { data, error } = await client.auth.signInWithPassword({
    email: targetEmail,
    password: pass,
  });

  if (error && !input.includes('@')) {
    const candidateEmails: string[] = [];
    if (input.toLowerCase().includes('elbioh')) {
      candidateEmails.push('elbioheditor@gmail.com');
    }
    try {
      const { data: prof } = await client
        .from('profiles')
        .select('id, email')
        .ilike('username', input)
        .maybeSingle();
      if (prof?.email && !candidateEmails.includes(prof.email)) {
        candidateEmails.push(prof.email);
      }
    } catch {
      // ignore
    }

    for (const cand of candidateEmails) {
      if (cand !== targetEmail) {
        const retry = await client.auth.signInWithPassword({
          email: cand,
          password: pass,
        });
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
          break;
        }
      }
    }
  }

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return {
        user: null,
        profile: null,
        error: 'Usuário/E-mail ou senha incorretos.',
      };
    }
    return { user: null, profile: null, error: error.message };
  }

  if (!data?.user) {
    return { user: null, profile: null, error: 'Usuário não encontrado.' };
  }

  let profile = await fetchUserProfileMobile(data.user.id);
  if (!profile) {
    const rawUsername =
      data.user.user_metadata?.username ||
      (!input.includes('@') ? input : data.user.email?.split('@')[0]) ||
      'Usuário';

    profile = {
      id: data.user.id,
      username: rawUsername,
      friendCode: generateFriendCode(rawUsername),
      avatarColor: data.user.user_metadata?.avatar_color || '#a855f7',
      createdAt: new Date().toISOString(),
    };
    await upsertProfileSafely(client, {
      id: profile.id,
      username: profile.username,
      friendCode: profile.friendCode,
      avatarColor: profile.avatarColor,
      email: data.user.email,
    });
  }

  return { user: data.user, profile };
}

export async function signOutUserMobile(): Promise<void> {
  await mobileStorageAdapter.removeItem(REMEMBER_ME_STORAGE_KEY);
  const client = getSupabaseMobileClient();
  await client.auth.signOut();
}

export async function getCurrentUserMobile(): Promise<User | null> {
  if (await isRememberMeExpired()) {
    await signOutUserMobile();
    return null;
  }
  const client = getSupabaseMobileClient();
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
  } catch {
    // ignore
  }
  const { data } = await client.auth.getUser();
  return data.user || null;
}

export async function fetchUserProfileMobile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseMobileClient();
  const resWithEmail = await client
    .from('profiles')
    .select('id, username, friend_code, avatar_color, email, created_at')
    .eq('id', userId)
    .maybeSingle();

  let data = resWithEmail.data;
  if (resWithEmail.error && resWithEmail.error.code === '42703') {
    const resWithoutEmail = await client
      .from('profiles')
      .select('id, username, friend_code, avatar_color, created_at')
      .eq('id', userId)
      .maybeSingle();
    data = resWithoutEmail.data as typeof data;
  }

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    friendCode: data.friend_code,
    avatarColor: data.avatar_color,
    email: data.email,
    createdAt: data.created_at,
  };
}

export async function fetchFriendshipsMobile(userId: string): Promise<Friendship[]> {
  const client = getSupabaseMobileClient();
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

export async function sendFriendRequestMobile(
  userId: string,
  rawFriendCode: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseMobileClient();
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
    return { success: false, message: 'Você não pode adicionar a si mesmo.' };
  }

  const { data: existing } = await client
    .from('friendships')
    .select('id, status')
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${userId})`
    );

  if (existing && existing.length > 0) {
    if (existing[0].status === 'accepted') {
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

  return {
    success: true,
    message: `Solicitação enviada com sucesso para ${targetProfile.username}!`,
  };
}

export async function respondToFriendRequestMobile(
  friendshipId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseMobileClient();
  if (accept) {
    const { error } = await client
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  const { error } = await client
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchUserAndFriendsBoardsMobile(
  userId: string,
  acceptedFriendIds: string[]
): Promise<{ ownerBoard: UserBoardPayload | null; friendsBoards: UserBoardPayload[] }> {
  const client = getSupabaseMobileClient();
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

export async function saveUserBoardToCloudMobile(
  userId: string,
  payload: UserBoardPayload
): Promise<boolean> {
  const client = getSupabaseMobileClient();
  try {
    const { data: existing } = await client
      .from('user_boards')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await client
        .from('user_boards')
        .update({
          name: payload.board.name,
          board_state: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return !error;
    } else {
      const { error } = await client.from('user_boards').insert({
        owner_id: userId,
        name: payload.board.name,
        board_state: payload,
        updated_at: new Date().toISOString(),
      });
      return !error;
    }
  } catch {
    return false;
  }
}

/**
 * Subscribes to live PostgreSQL changes on `user_boards` so that when a task or stopwatch
 * is started/paused/edited on the Desktop PC, the Mobile app updates immediately!
 */
export function subscribeToUserBoardsRealtime(
  watchedUserIds: string[],
  onRemoteBoardUpdate: (ownerId: string, payload: UserBoardPayload) => void
): () => void {
  const client = getSupabaseMobileClient();
  const channel: RealtimeChannel = client
    .channel('neon-mobile-user-boards')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_boards',
      },
      (eventPayload: { new?: { owner_id?: string; board_state?: UserBoardPayload } }) => {
        const ownerId = eventPayload.new?.owner_id;
        const boardState = eventPayload.new?.board_state;
        if (ownerId && boardState && watchedUserIds.includes(ownerId)) {
          onRemoteBoardUpdate(ownerId, boardState);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
