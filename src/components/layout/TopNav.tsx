import { NavLink, useNavigate } from 'react-router-dom';
import { AgentPicker } from './AgentPicker';
import { cn } from '@/lib/utils';

const links = [
  { to: '/new-quote', label: 'New Quote' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/admin', label: 'Admin' },
];

export function TopNav() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="container max-w-6xl flex h-14 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/quotes')}
          className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center text-sm font-bold tracking-tight hover:opacity-80 transition-opacity active:scale-95"
        >
          SM
        </button>
        <nav className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 text-sm rounded-lg transition-colors font-medium',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
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
