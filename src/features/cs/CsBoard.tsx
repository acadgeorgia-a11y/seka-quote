import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Circle, BookOpen, Zap, Eye, CheckCircle2 } from 'lucide-react';
import { listTasks, updateTask } from '@/lib/supabase/queries/tasks';
import { toast } from '@/components/ui/toast';
import { TaskModal } from './TaskModal';
import type { Task, TaskStatus, TaskAssignee } from '@/lib/supabase/types';

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'not_started', label: 'Not Started', icon: <Circle className="h-4 w-4" />,       color: 'text-muted-foreground' },
  { status: 'planning',    label: 'Planning',    icon: <BookOpen className="h-4 w-4" />,      color: 'text-blue-500' },
  { status: 'in_progress', label: 'In Progress', icon: <Zap className="h-4 w-4" />,           color: 'text-amber-500' },
  { status: 'review',      label: 'Review',      icon: <Eye className="h-4 w-4" />,           color: 'text-purple-500' },
  { status: 'done',        label: 'Done',        icon: <CheckCircle2 className="h-4 w-4" />,  color: 'text-green-500' },
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

function TaskCardInner({ task }: { task: Task }) {
  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  return (
    <div className="space-y-2.5">
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
    </div>
  );
}

function DraggableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-card rounded-2xl p-3.5 shadow-sm border border-border/30 transition-shadow ${isDragging ? '' : 'hover:border-border/60 hover:shadow-md'} cursor-grab active:cursor-grabbing`}
        {...listeners}
        {...attributes}
      >
        {/* Tap zone separate from drag — click fires on short press */}
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <TaskCardInner task={task} />
        </button>
      </motion.div>
    </div>
  );
}

function DroppableColumn({
  status, label, icon, color, tasks, onAddClick, onCardClick,
}: {
  status: TaskStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
  onAddClick: () => void;
  onCardClick: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="shrink-0 w-[280px] snap-start flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className={`flex items-center gap-2 font-semibold text-sm ${color}`}>
          {icon}
          {label}
          <span className="text-xs font-normal text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-2xl p-2 transition-colors min-h-[120px] ${
          isOver ? 'bg-accent/5 ring-2 ring-accent/20' : ''
        }`}
      >
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}
        {tasks.length === 0 && (
          <button
            type="button"
            onClick={onAddClick}
            className={`w-full py-6 rounded-2xl border-2 border-dashed text-xs transition-colors ${
              isOver ? 'border-accent/40 text-accent' : 'border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground'
            }`}
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}

export function CsBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState<TaskAssignee | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('not_started');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((e) => toast({ title: 'Failed to load tasks', description: e.message, variant: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find((t) => t.id === e.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await updateTask(taskId, { status: newStatus }, task.assignee);
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => t.id === taskId ? task : t));
      toast({ title: 'Failed to move task', variant: 'error' });
    }
  }

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
      return exists ? prev.map((t) => t.id === saved.id ? saved : t) : [saved, ...prev];
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
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.status}
              status={col.status}
              label={col.label}
              icon={col.icon}
              color={col.color}
              tasks={filtered.filter((t) => t.status === col.status)}
              onAddClick={() => openCreate(col.status)}
              onCardClick={openEdit}
            />
          ))}
        </div>

        {/* Drag overlay — ghost card while dragging */}
        <DragOverlay>
          {activeTask && (
            <div className="bg-card rounded-2xl p-3.5 shadow-xl border border-border/60 w-[264px] rotate-2 opacity-95">
              <TaskCardInner task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
