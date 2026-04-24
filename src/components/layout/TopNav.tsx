import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AgentPicker } from './AgentPicker';
import { cn } from '@/lib/utils';

const links = [
  { to: '/new-quote', label: 'New Quote' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/admin', label: 'Admin' },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container max-w-6xl flex h-14 items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="font-serif text-xl tracking-tight2"
        >
          Seka <span className="text-muted-foreground">Quote</span>
        </motion.div>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <AgentPicker />
      </div>
    </header>
  );
}
