import { supabase } from '../client';
import type { Task, TaskInsert } from '../types';

// Cast through unknown to avoid strict Database generic conflicts with tasks table
const db = supabase as unknown as {
  from: (table: 'tasks') => ReturnType<typeof supabase.from>;
};

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error((error as { message: string }).message);
  return (data ?? []) as Task[];
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const { data, error } = await db
    .from('tasks')
    .insert(task)
    .select()
    .single();
  if (error) throw new Error((error as { message: string }).message);
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<TaskInsert>): Promise<Task> {
  const { data, error } = await db
    .from('tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error((error as { message: string }).message);
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) throw new Error((error as { message: string }).message);
}
