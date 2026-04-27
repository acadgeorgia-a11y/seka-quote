import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PlusCircle, FileText, ClipboardList, Receipt, FilePen, Settings2, ChevronUp, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgent } from '@/stores/useAgent';

const SALES_LINKS = [
  { to: '/new-quote', label: 'New Quote', icon: PlusCircle },
  { to: '/quotes',    label: 'Quotes',    icon: FileText },
  { to: '/leads',     label: 'Leads',     icon: TrendingUp },
];

const CS_LINKS = [
  { to: '/cs',        label: 'Tasks',     icon: ClipboardList },
  { to: '/invoices',  label: 'Invoices',  icon: Receipt },
  { to: '/contracts', label: 'Contracts', icon: FilePen },
];

function SectionPopup({
  links,
  onClose,
}: {
  links: { to: string; label: string; icon: React.ElementType }[];
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Menu */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden w-44">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </>
  );
}

export function BottomNav() {
  const { agent } = useAgent();
  const location = useLocation();
  const [open, setOpen] = useState<'sales' | 'cs' | null>(null);

  const isOwner = agent?.role === 'owner';
  const canSales = isOwner || (agent?.section_access?.sales ?? true);
  const canCs = isOwner || (agent?.section_access?.cs ?? true);

  const salesActive = SALES_LINKS.some(l => location.pathname.startsWith(l.to));
  const csActive = CS_LINKS.some(l => location.pathname.startsWith(l.to));
  const adminActive = location.pathname.startsWith('/admin');

  function toggle(section: 'sales' | 'cs') {
    setOpen(prev => (prev === section ? null : section));
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-stretch">

        {/* Sales */}
        {canSales && (
          <div className="relative flex-1">
            {open === 'sales' && (
              <SectionPopup links={SALES_LINKS} onClose={() => setOpen(null)} />
            )}
            <button
              type="button"
              onClick={() => toggle('sales')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-full py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors',
                salesActive || open === 'sales' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <PlusCircle
                className={cn('h-5 w-5', (salesActive || open === 'sales') && 'fill-accent/10')}
                strokeWidth={salesActive || open === 'sales' ? 2.5 : 1.8}
              />
              Sales
              <ChevronUp className={cn('h-2.5 w-2.5 -mt-0.5 transition-transform', open === 'sales' && 'rotate-180')} />
            </button>
          </div>
        )}

        {/* CS */}
        {canCs && (
          <div className="relative flex-1">
            {open === 'cs' && (
              <SectionPopup links={CS_LINKS} onClose={() => setOpen(null)} />
            )}
            <button
              type="button"
              onClick={() => toggle('cs')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-full py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors',
                csActive || open === 'cs' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <ClipboardList
                className={cn('h-5 w-5', (csActive || open === 'cs') && 'fill-accent/10')}
                strokeWidth={csActive || open === 'cs' ? 2.5 : 1.8}
              />
              CS
              <ChevronUp className={cn('h-2.5 w-2.5 -mt-0.5 transition-transform', open === 'cs' && 'rotate-180')} />
            </button>
          </div>
        )}

        {/* Admin */}
        <NavLink
          to="/admin"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors',
            adminActive ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {({ isActive }) => (
            <>
              <Settings2
                className={cn('h-5 w-5', isActive && 'fill-accent/10')}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              Admin
            </>
          )}
        </NavLink>

      </div>
    </nav>
  );
}
