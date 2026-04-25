import { NavLink } from 'react-router-dom';
import { PlusCircle, FileText, ClipboardList, Receipt, FilePen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgent } from '@/stores/useAgent';

const allTabs = [
  { to: '/new-quote', label: 'New Quote', icon: PlusCircle,   section: 'sales' },
  { to: '/quotes',    label: 'Quotes',    icon: FileText,      section: 'sales' },
  { to: '/cs',        label: 'Tasks',     icon: ClipboardList, section: 'cs' },
  { to: '/invoices',  label: 'Invoices',  icon: Receipt,       section: 'cs' },
  { to: '/contracts', label: 'Contracts', icon: FilePen,       section: 'cs' },
];

export function BottomNav() {
  const { agent } = useAgent();
  const isOwner = agent?.role === 'owner';
  const canSales = isOwner || (agent?.section_access?.sales ?? true);
  const canCs = isOwner || (agent?.section_access?.cs ?? true);

  const tabs = allTabs.filter(t => {
    if (t.section === 'sales') return canSales;
    if (t.section === 'cs') return canCs;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-stretch overflow-x-auto scrollbar-none">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors min-w-[56px]',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'fill-accent/10')} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
