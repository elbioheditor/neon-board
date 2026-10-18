import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { NeonStoreState } from '../types';

const CONFIG_STORAGE_KEY = 'neon_supabase_config_v2';
const ROOM_KEY = 'elbioh_didi_main_workspace';

export const DEFAULT_SUPABASE_URL = 'https://adiqvvqfwbtxgrohkaop.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_u2gBRJWzAYN2AlnlPi7XXg_ffkwU1dA';

export interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enabled: boolean;
}

let supabase: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

export function getSavedCloudConfig(): CloudConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read cloud config', e);
  }

  const defaultConfig: CloudConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    supabaseAnonKey:
      import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
    enabled: true,
  };

  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaultConfig));
  } catch {
    // ignore
  }

  return defaultConfig;
}

export function saveCloudConfig(config: CloudConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function initCloudClient(
  config: CloudConfig,
  onRemoteStateUpdate: (newState: NeonStoreState) => void,
  onStatusChange: (
    status: 'disconnected' | 'connecting' | 'connected' | 'error'
  ) => void
) {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  supabase = null;

  if (!config.enabled || !config.supabaseUrl || !config.supabaseAnonKey) {
    onStatusChange('disconnected');
    return;
  }

  try {
    onStatusChange('connecting');
    supabase = createClient(
      config.supabaseUrl.trim(),
      config.supabaseAnonKey.trim()
    );

    channel = supabase
      .channel('neon-realtime-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'neon_sync',
          filter: `room_key=eq.${ROOM_KEY}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.state) {
            onRemoteStateUpdate(payload.new.state as NeonStoreState);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onStatusChange('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onStatusChange('error');
        }
      });
  } catch (err) {
    console.error('Error initializing Supabase:', err);
    onStatusChange('error');
  }
}

export async function pullCloudState(): Promise<NeonStoreState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('neon_sync')
      .select('state')
      .eq('room_key', ROOM_KEY)
      .maybeSingle();

    if (error || !data) return null;
    return data.state as NeonStoreState;
  } catch {
    return null;
  }
}

export async function pushCloudState(state: NeonStoreState): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('neon_sync').upsert(
      {
        room_key: ROOM_KEY,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_key' }
    );
    return !error;
  } catch {
    return false;
  }
}
