import { supabase } from '../client';
import type { TollZone, TollRoute, CrzRate } from '../types';

export async function getTollZones(): Promise<TollZone[]> {
  const { data, error } = await supabase
    .from('toll_zones')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getTollRoutes(): Promise<TollRoute[]> {
  const { data, error } = await supabase
    .from('toll_routes')
    .select('*')
    .order('from_zone');
  if (error) throw error;
  return data ?? [];
}

export async function getCrzRates(): Promise<CrzRate[]> {
  const { data, error } = await supabase.from('crz_rates').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function updateTollRoute(
  id: string,
  patch: { round_trip_toll?: number; crz_applies?: boolean; notes?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('toll_routes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTollZone(
  id: string,
  patch: { name?: string; description?: string | null },
): Promise<void> {
  const { error } = await supabase.from('toll_zones').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateCrzRate(id: string, amount: number): Promise<void> {
  const { error } = await supabase.from('crz_rates').update({ amount }).eq('id', id);
  if (error) throw error;
}
