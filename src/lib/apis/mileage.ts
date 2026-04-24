import { supabase } from '../supabase/client';

export interface MileageResponse {
  roundTripMiles: number;
}

export async function getRoundTripMiles(input: {
  origin: string;
  destination: string;
  officeAddress: string;
  extraStops?: string[];
}): Promise<MileageResponse> {
  const { data, error } = await supabase.functions.invoke<MileageResponse>('mileage', {
    body: input,
  });
  if (error) throw new Error(`mileage: ${error.message}`);
  if (!data) throw new Error('mileage: empty response');
  return data;
}
