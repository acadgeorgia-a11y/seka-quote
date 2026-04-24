import { motion } from 'framer-motion';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';

export function DualPriceCard({ morning, afternoon }: { morning: number; afternoon: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 gap-3"
    >
      {(['morning', 'afternoon'] as const).map((slot) => (
        <div
          key={slot}
          className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center"
        >
          <div className="text-xs text-muted-foreground mb-2 capitalize">{slot}</div>
          <MoneyDisplay
            value={slot === 'morning' ? morning : afternoon}
            className="font-serif text-2xl tracking-tight2 tabular-nums"
          />
        </div>
      ))}
    </motion.div>
  );
}
