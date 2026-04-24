import { supabase } from '../supabase/client';

export interface TollsResponse {
  tolls: number;
}

/**
 * Calls the `tolls` Edge Function which proxies TollGuru.
 * Route: office → origin → destination → office.
 */
export async function getTolls(input: {
  origin: string;
  destination: string;
  officeAddress: string;
}): Promise<TollsResponse> {
  const { data, error } = await supabase.functions.invoke<TollsResponse>('tolls', {
    body: input,
  });
  if (error) throw new Error(`tolls: ${error.message}`);
  if (!data) throw new Error('tolls: empty response');
  return data;
}
