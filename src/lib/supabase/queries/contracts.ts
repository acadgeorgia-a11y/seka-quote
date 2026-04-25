import { supabase } from '../client';
import type { Contract, ContractInsert, ContractTemplate } from '../types';

const db = supabase as unknown as {
  from: (t: 'contracts' | 'contract_templates') => ReturnType<typeof supabase.from>;
};

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await db.from('contracts').select('*').order('created_at', { ascending: false });
  if (error) throw new Error((error as { message: string }).message);
  return (data ?? []) as Contract[];
}

export async function getContractByToken(token: string): Promise<Contract | null> {
  const { data, error } = await db.from('contracts').select('*').eq('token', token).single();
  if (error) return null;
  return data as Contract;
}

export async function createContract(input: ContractInsert): Promise<Contract> {
  const { data, error } = await db.from('contracts').insert(input).select().single();
  if (error) throw new Error((error as { message: string }).message);
  return data as Contract;
}

export async function updateContract(id: string, patch: Partial<ContractInsert>): Promise<Contract> {
  const { data, error } = await db.from('contracts').update(patch).eq('id', id).select().single();
  if (error) throw new Error((error as { message: string }).message);
  return data as Contract;
}

export async function listTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await db.from('contract_templates').select('*').order('created_at', { ascending: false });
  if (error) throw new Error((error as { message: string }).message);
  return (data ?? []) as ContractTemplate[];
}

export async function createTemplate(input: Omit<ContractTemplate, 'id' | 'created_at'>): Promise<ContractTemplate> {
  const { data, error } = await db.from('contract_templates').insert(input).select().single();
  if (error) throw new Error((error as { message: string }).message);
  return data as ContractTemplate;
}

export async function updateTemplate(id: string, patch: Partial<ContractTemplate>): Promise<void> {
  const { error } = await db.from('contract_templates').update(patch).eq('id', id);
  if (error) throw new Error((error as { message: string }).message);
}
