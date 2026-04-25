import { NavLink } from 'react-router-dom';
import { PlusCircle, FileText, ClipboardList, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/new-quote', label: 'New Quote', icon: PlusCircle },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/cs', label: 'CS', icon: ClipboardList },
  { to: '/admin', label: 'Admin', icon: Settings2 },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-stretch">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[10px] font-medium transition-colors',
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
