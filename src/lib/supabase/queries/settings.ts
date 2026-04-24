import { supabase } from '../client';
import type { Settings } from '../types';

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as Settings;
}

export async function updateSettings(patch: Partial<Settings>) {
  const { error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}
