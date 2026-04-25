import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { createTask, updateTask, deleteTask } from '@/lib/supabase/queries/tasks';
import type { Task, TaskStatus, TaskPriority, TaskAssignee } from '@/lib/supabase/types';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ASSIGNEES: TaskAssignee[] = ['Alex', 'Terry', 'Chris', 'Rob'];

interface Props {
  task?: Task | null;
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted?: (id: string) => void;
}

export function TaskModal({ task, defaultStatus = 'not_started', onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [assignee, setAssignee] = useState<TaskAssignee | ''>(task?.assignee ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        assignee: assignee || null,
        priority,
        due_date: dueDate || null,
      };
      const saved = task
        ? await updateTask(task.id, payload, task.assignee)
        : await createTask(payload);
      onSaved(saved);
      toast({ title: task ? 'Task updated' : 'Task created', variant: 'success' });
    } catch (e) {
      toast({ title: 'Failed to save', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDeleted?.(task.id);
      toast({ title: 'Task deleted', variant: 'success' });
    } catch (e) {
      toast({ title: 'Failed to delete', description: (e as Error).message, variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full md:max-w-lg bg-card rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSave}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
              <h2 className="font-semibold text-base">{task ? 'Edit task' : 'New task'}</h2>
              <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes, details, links…"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-sm">
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-sm">
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned to</Label>
                  <select value={assignee} onChange={(e) => setAssignee(e.target.value as TaskAssignee | '')}
                    className="w-full h-9 rounded-xl border border-input bg-background px-2.5 text-sm">
                    <option value="">Unassigned</option>
                    {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border/40">
              {task ? (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !title.trim()}
                  className="px-5 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
