import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'info';
}

interface ToastStore {
  items: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (t) =>
    set((s) => {
      const id = Date.now() + Math.random();
      setTimeout(() => set((ss) => ({ items: ss.items.filter((x) => x.id !== id) })), 4000);
      return { items: [...s.items, { ...t, id }] };
    }),
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function toast(opts: Omit<Toast, 'id'>) {
  useToastStore.getState().push(opts);
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto rounded-lg border bg-popover text-popover-foreground shadow-md px-4 py-3 min-w-[280px] text-left',
              'flex items-start gap-3',
            )}
          >
            {t.variant === 'error' ? (
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            ) : t.variant === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
