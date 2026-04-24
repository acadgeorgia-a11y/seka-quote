import { cn } from '@/lib/utils';

export const STEPS = ['Move', 'Job', 'Add-ons', 'Review'];

export function StepIndicator({ current, onJump }: { current: number; onJump?: (i: number) => void }) {
  return (
    <nav className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onJump?.(i)}
            className="flex items-center gap-1.5 group"
          >
            <span
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : done
                  ? 'bg-foreground/20 text-foreground'
                  : 'bg-secondary text-muted-foreground',
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={cn('text-sm font-medium transition-colors', active ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-border mx-1">›</span>}
          </button>
        );
      })}
    </nav>
  );
}
