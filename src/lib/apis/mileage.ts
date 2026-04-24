import { supabase } from '../supabase/client';

export interface MileageResponse {
  roundTripMiles: number;
  tolls: number;
}

/**
 * Calls the `mileage` Edge Function. Client never talks to Google Maps
 * directly (that keeps the API key server-side).
 *
 * The Edge Function is expected to return the full office→origin→destination→office
 * round-trip in miles.
 */
export async function getRoundTripMiles(input: {
  origin: string;
  destination: string;
  officeAddress: string;
}): Promise<MileageResponse> {
  const { data, error } = await supabase.functions.invoke<MileageResponse>('mileage', {
    body: input,
  });
  if (error) throw new Error(`mileage: ${error.message}`);
  if (!data) throw new Error('mileage: empty response');
  return data;
}
