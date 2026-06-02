import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://bzsazvnctziqiyvznzrc.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_PWBEKdNGrYkiPTgWDo3EEg_BKMBlcc9';

if (!supabaseAnonKey) {
  console.warn('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Supabase login will not work until it is configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
