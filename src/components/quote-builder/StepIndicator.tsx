import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const STEPS = ['Move', 'Job', 'Add-ons', 'Review'];

export function StepIndicator({ current, onJump }: { current: number; onJump?: (i: number) => void }) {
  return (
    <nav className="flex items-center gap-3">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onJump?.(i)}
            className="flex items-center gap-2 group"
          >
            <motion.span
              layoutId={`dot-${i}`}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : done
                  ? 'bg-success/20 text-success'
                  : 'bg-secondary text-muted-foreground group-hover:bg-secondary/80',
              )}
            >
              {i + 1}
            </motion.span>
            <span
              className={cn(
                'text-sm transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40 mx-1">·</span>}
          </button>
        );
      })}
    </nav>
  );
}
