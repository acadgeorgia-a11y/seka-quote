import { supabase } from '../client';
import type {
  RateLocalCuft,
  RateLocalHourly,
  RateLongDistance,
  RateOutOfState,
  RateBox,
  RateHeavyItem,
  Settings,
} from '../types';

export interface RateBundle {
  localCuft: RateLocalCuft[];
  localHourly: RateLocalHourly[];
  longDistance: RateLongDistance[];
  outOfState: RateOutOfState;
  boxes: RateBox[];
  heavyItems: RateHeavyItem[];
  misc: Record<string, number>;
  settings: Settings;
}

export async function getAllRates(): Promise<RateBundle> {
  const [
    cuft,
    hourly,
    ld,
    oos,
    boxes,
    heavy,
    misc,
    settings,
  ] = await Promise.all([
    supabase.from('rates_local_cuft').select('*'),
    supabase.from('rates_local_hourly').select('*'),
    supabase.from('rates_long_distance').select('*'),
    supabase.from('rates_out_of_state').select('*').eq('id', 1).single(),
    supabase.from('rates_boxes').select('*'),
    supabase.from('rates_heavy_items').select('*').order('item_name'),
    supabase.from('rates_misc').select('*'),
    supabase.from('settings').select('*').eq('id', 1).single(),
  ]);

  for (const r of [cuft, hourly, ld, oos, boxes, heavy, misc, settings]) {
    if (r.error) throw r.error;
  }

  const miscMap: Record<string, number> = {};
  for (const row of misc.data ?? []) miscMap[row.key] = Number(row.value);

  return {
    localCuft: cuft.data ?? [],
    localHourly: hourly.data ?? [],
    longDistance: ld.data ?? [],
    outOfState: oos.data as RateOutOfState,
    boxes: boxes.data ?? [],
    heavyItems: heavy.data ?? [],
    misc: miscMap,
    settings: settings.data as Settings,
  };
}

export async function updateLocalCuft(rows: RateLocalCuft[]) {
  const { error } = await supabase.from('rates_local_cuft').upsert(rows);
  if (error) throw error;
}

export async function updateLocalHourly(rows: RateLocalHourly[]) {
  const { error } = await supabase.from('rates_local_hourly').upsert(rows);
  if (error) throw error;
}

export async function updateLongDistance(rows: RateLongDistance[]) {
  const { error } = await supabase.from('rates_long_distance').upsert(rows);
  if (error) throw error;
}

export async function updateOutOfState(row: RateOutOfState) {
  const { error } = await supabase.from('rates_out_of_state').upsert({ ...row, id: 1 });
  if (error) throw error;
}

export async function updateBoxes(rows: RateBox[]) {
  const { error } = await supabase.from('rates_boxes').upsert(rows);
  if (error) throw error;
}

export async function updateHeavyItems(rows: RateHeavyItem[]) {
  const { error } = await supabase.from('rates_heavy_items').upsert(rows);
  if (error) throw error;
}

export async function deleteHeavyItem(id: number) {
  const { error } = await supabase.from('rates_heavy_items').delete().eq('id', id);
  if (error) throw error;
}

export async function insertHeavyItem(row: Omit<RateHeavyItem, 'id'>) {
  const { data, error } = await supabase.from('rates_heavy_items').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateMisc(rows: { key: string; value: number }[]) {
  const { error } = await supabase.from('rates_misc').upsert(rows.map((r) => ({ ...r, notes: null })));
  if (error) throw error;
}
