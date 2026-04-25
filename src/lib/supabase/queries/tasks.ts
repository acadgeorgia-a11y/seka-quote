import { supabase } from '../client';
import type { Task, TaskInsert } from '../types';

// Cast through unknown to avoid strict Database generic conflicts with tasks table
const db = supabase as unknown as {
  from: (table: 'tasks') => ReturnType<typeof supabase.from>;
};

async function notifyAssignee(
  assignee: string,
  taskTitle: string,
  taskDescription: string | null | undefined,
  priority: string,
  dueDate: string | null | undefined,
  isUpdate: boolean,
) {
  try {
    const { error } = await supabase.functions.invoke('notify-task', {
      body: { assignee, taskTitle, taskDescription, priority, dueDate, isUpdate },
    });
    if (error) console.error('[notify-task]', error);
  } catch (e) {
    console.error('[notify-task] invoke failed', e);
  }
}

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
  const saved = data as Task;

  if (saved.assignee) {
    notifyAssignee(saved.assignee, saved.title, saved.description, saved.priority, saved.due_date, false);
  }

  return saved;
}

export async function updateTask(id: string, patch: Partial<TaskInsert>, previousAssignee?: string | null): Promise<Task> {
  const { data, error } = await db
    .from('tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error((error as { message: string }).message);
  const saved = data as Task;

  // Notify if assignee was just set or changed
  if (saved.assignee && saved.assignee !== previousAssignee) {
    notifyAssignee(saved.assignee, saved.title, saved.description, saved.priority, saved.due_date, !!previousAssignee);
  }

  return saved;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) throw new Error((error as { message: string }).message);
}
