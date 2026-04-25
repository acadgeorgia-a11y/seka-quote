import { supabase } from '../client';
import type { Agent } from '../types';

export async function listActiveAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function listAllAgents(): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('*').order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function createAgent(input: { full_name: string; email: string; role?: 'agent' | 'owner' | 'dispatch' | 'cs' }) {
  const { data, error } = await supabase
    .from('agents')
    .insert({ full_name: input.full_name, email: input.email, role: input.role ?? 'agent', active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setAgentActive(id: string, active: boolean) {
  const { error } = await supabase.from('agents').update({ active }).eq('id', id);
  if (error) throw error;
}
