import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Circle, BookOpen, Zap, Eye, CheckCircle2 } from 'lucide-react';
import { listTasks } from '@/lib/supabase/queries/tasks';
import { toast } from '@/components/ui/toast';
import { TaskModal } from './TaskModal';
import type { Task, TaskStatus, TaskAssignee } from '@/lib/supabase/types';

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'not_started', label: 'Not Started', icon: <Circle className="h-4 w-4" />, color: 'text-muted-foreground' },
  { status: 'planning',    label: 'Planning',    icon: <BookOpen className="h-4 w-4" />, color: 'text-blue-500' },
  { status: 'in_progress', label: 'In Progress', icon: <Zap className="h-4 w-4" />,     color: 'text-amber-500' },
  { status: 'review',      label: 'Review',      icon: <Eye className="h-4 w-4" />,     color: 'text-purple-500' },
  { status: 'done',        label: 'Done',        icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
];

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted-foreground/40',
  medium: 'bg-blue-400',
  high: 'bg-amber-400',
  urgent: 'bg-red-500',
};

const ASSIGNEE_COLOR: Record<string, string> = {
  Alex:  'bg-foreground text-background',
  Terry: 'bg-blue-500 text-white',
  Chris: 'bg-emerald-500 text-white',
  Rob:   'bg-amber-500 text-white',
};

const ALL_ASSIGNEES: TaskAssignee[] = ['Alex', 'Terry', 'Chris', 'Rob'];

function Avatar({ name }: { name: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${ASSIGNEE_COLOR[name] ?? 'bg-secondary text-foreground'}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left bg-card rounded-2xl p-3.5 shadow-sm border border-border/30 hover:border-border/60 hover:shadow-md transition-all active:scale-[0.99] space-y-2.5"
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
        <span className="text-sm font-medium leading-snug flex-1">{task.title}</span>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{task.description}</p>
      )}
      <div className="flex items-center justify-between pl-4">
        {task.assignee ? <Avatar name={task.assignee} /> : <span />}
        {task.due_date && (
          <span className={`text-[10px] font-medium ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export function CsBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState<TaskAssignee | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('not_started');

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((e) => toast({ title: 'Failed to load tasks', description: e.message, variant: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  function openCreate(status: TaskStatus) {
    setEditTask(null);
    setDefaultStatus(status);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setModalOpen(true);
  }

  function handleSaved(saved: Task) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    setModalOpen(false);
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModalOpen(false);
  }

  const filtered = filterAssignee ? tasks.filter((t) => t.assignee === filterAssignee) : tasks;

  if (loading) {
    return (
      <div className="py-6 space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-secondary rounded-xl" />
        <div className="flex gap-4 overflow-x-auto">
          {COLUMNS.map((c) => <div key={c.status} className="w-64 shrink-0 h-96 bg-secondary rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight2">Tasks</h1>
        <button
          type="button"
          onClick={() => openCreate('not_started')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity active:scale-95"
        >
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>

      {/* Assignee filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterAssignee('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterAssignee === '' ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          Everyone
        </button>
        {ALL_ASSIGNEES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setFilterAssignee(filterAssignee === a ? '' : a)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterAssignee === a ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Avatar name={a} />
            {a}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className="shrink-0 w-[280px] snap-start space-y-2"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1 mb-3">
                <div className={`flex items-center gap-2 font-semibold text-sm ${col.color}`}>
                  {col.icon}
                  {col.label}
                  <span className="text-xs font-normal text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(col.status)}
                  className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <div key={task.id}>
                    <TaskCard task={task} onClick={() => openEdit(task)} />
                    {/* Quick move buttons */}
                    <div className="flex gap-1 mt-1 px-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <button
                    type="button"
                    onClick={() => openCreate(col.status)}
                    className="w-full py-6 rounded-2xl border-2 border-dashed border-border/40 text-xs text-muted-foreground hover:border-border/60 hover:text-foreground transition-colors"
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status move legend */}
      <p className="text-xs text-muted-foreground text-center">
        Tap a card to edit · Change status inside to move it between columns
      </p>

      {modalOpen && (
        <TaskModal
          task={editTask}
          defaultStatus={defaultStatus}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
