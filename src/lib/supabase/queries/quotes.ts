import { supabase } from '../client';
import type { QuoteInsert, QuoteRow, QuoteStatus } from '../types';

export interface QuoteListRow extends QuoteRow {
  agent: { id: string; full_name: string } | null;
}

export async function listQuotes(filters?: {
  agentId?: string;
  status?: QuoteStatus;
  moveType?: 'local' | 'long_distance' | 'out_of_state';
  limit?: number;
}): Promise<QuoteListRow[]> {
  let q = supabase
    .from('quotes')
    .select('*, agent:agents(id, full_name)')
    .order('created_at', { ascending: false });

  if (filters?.agentId) q = q.eq('agent_id', filters.agentId);
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.moveType) q = q.eq('move_type', filters.moveType);
  q = q.limit(filters?.limit ?? 200);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as QuoteListRow[];
}

export async function getQuoteByCode(quoteCode: string): Promise<QuoteListRow | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, agent:agents(id, full_name)')
    .eq('quote_code', quoteCode)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as QuoteListRow | null) ?? null;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
}

function randomSuffix(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function generateQuoteCode(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `SQ-${y}-${m}${d}-${randomSuffix(4)}`;
}

export async function createQuote(insert: Omit<QuoteInsert, 'quote_code'>): Promise<QuoteRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const quote_code = generateQuoteCode();
    const { data, error } = await supabase
      .from('quotes')
      .insert({ ...insert, quote_code })
      .select()
      .single();
    if (!error) return data as QuoteRow;
    const isUnique = (error as { code?: string }).code === '23505';
    if (!isUnique) throw error;
  }
  throw new Error('Could not generate unique quote code after 5 attempts');
}
