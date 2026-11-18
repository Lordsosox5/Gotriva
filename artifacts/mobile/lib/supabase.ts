import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const webStorage =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.localStorage
    : undefined;
const sessionStorage =
  Platform.OS === 'web' ? webStorage : AsyncStorage;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null =
  isSupabaseConfigured && supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          ...(sessionStorage ? { storage: sessionStorage } : {}),
          autoRefreshToken: true,
          persistSession: Boolean(sessionStorage),
          detectSessionInUrl: false,
        },
        realtime: {
          params: { eventsPerSecond: 5 },
        },
      })
    : null;

export function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return supabase;
}
