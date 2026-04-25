import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { AgentPicker } from './AgentPicker';
import { useAgent } from '@/stores/useAgent';
import { cn } from '@/lib/utils';

const sections = [
  {
    label: 'Sales',
    links: [
      { to: '/new-quote', label: 'New Quote' },
      { to: '/quotes', label: 'Quotes' },
    ],
  },
  {
    label: 'CS',
    links: [
      { to: '/cs', label: 'Task Board' },
      { to: '/invoices', label: 'Invoices' },
      { to: '/contracts', label: 'Contracts' },
    ],
  },
];

function SectionDropdown({ label, links }: { label: string; links: { to: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isActive = links.some(l => location.pathname.startsWith(l.to));

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 px-3.5 py-1.5 text-sm rounded-lg transition-colors font-medium',
          isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        )}
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-40 rounded-xl border bg-popover shadow-md overflow-hidden z-50">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-accent/10 text-accent font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agent } = useAgent();
  const isAdminActive = location.pathname.startsWith('/admin');

  const isOwner = agent?.role === 'owner';
  const canSales = isOwner || (agent?.section_access?.sales ?? true);
  const canCs = isOwner || (agent?.section_access?.cs ?? true);

  const visibleSections = sections.filter(s => {
    if (s.label === 'Sales') return canSales;
    if (s.label === 'CS') return canCs;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="container max-w-6xl flex h-14 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/new-quote')}
          className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center text-sm font-bold tracking-tight hover:opacity-80 transition-opacity active:scale-95"
        >
          SM
        </button>

        <nav className="hidden md:flex items-center gap-0.5">
          {visibleSections.map(s => (
            <SectionDropdown key={s.label} label={s.label} links={s.links} />
          ))}
          <NavLink
            to="/admin"
            className={cn(
              'px-3.5 py-1.5 text-sm rounded-lg transition-colors font-medium',
              isAdminActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
            )}
          >
            Admin
          </NavLink>
        </nav>

        <AgentPicker />
      </div>
    </header>
  );
}
