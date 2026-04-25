import { supabase } from '../client';
import type { Invoice, InvoiceInsert } from '../types';

const db = supabase as unknown as { from: (t: 'invoices') => ReturnType<typeof supabase.from> };

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await (db.from('invoices') as ReturnType<typeof supabase.from>)
    .select('*', { count: 'exact', head: true });
  const n = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `INV-${year}-${n}`;
}

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await db.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) throw new Error((error as { message: string }).message);
  return (data ?? []) as Invoice[];
}

export async function createInvoice(input: Omit<InvoiceInsert, 'invoice_number'>): Promise<Invoice> {
  const invoice_number = await nextInvoiceNumber();
  const { data, error } = await db.from('invoices').insert({ ...input, invoice_number }).select().single();
  if (error) throw new Error((error as { message: string }).message);
  return data as Invoice;
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  const { error } = await db.from('invoices').update({ status }).eq('id', id);
  if (error) throw new Error((error as { message: string }).message);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await db.from('invoices').delete().eq('id', id);
  if (error) throw new Error((error as { message: string }).message);
}
