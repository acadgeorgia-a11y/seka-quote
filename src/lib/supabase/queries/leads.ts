import { supabase } from '../client';
import type { Lead, LeadSyncLog } from '../types';

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('received_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function listSyncLogs(): Promise<LeadSyncLog[]> {
  const { data, error } = await supabase
    .from('lead_sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data as LeadSyncLog[];
}
