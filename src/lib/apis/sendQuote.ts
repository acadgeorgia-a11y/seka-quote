import { supabase } from '../supabase/client';
import type { PriceBreakdown } from '../pricing/types';

export interface SendQuotePayload {
  to: string;
  customerName: string;
  quoteCode: string;
  agentName: string;
  moveType: string;
  moveDate: string | null;
  originAddress: string;
  destinationAddress: string;
  crewSize: number;
  lines: PriceBreakdown['lines'];
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  morningTotal: number | null;
  afternoonTotal: number | null;
  monthlyStorage: PriceBreakdown['monthly_storage'] | null;
  flags: string[];
}

export async function sendQuoteEmail(payload: SendQuotePayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-quote', { body: payload });
  if (error) throw new Error(`send-quote: ${error.message}`);
}
