import { NavLink, Outlet } from 'react-router-dom';
import { AdminGate } from './AdminGate';
import { cn } from '@/lib/utils';

const sections = [
  { to: '/admin/rates/local', label: 'Local Rates' },
  { to: '/admin/rates/long-distance', label: 'Long Distance' },
  { to: '/admin/rates/addons', label: 'Add-ons' },
  { to: '/admin/tolls', label: 'Tolls' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/agents', label: 'Agents' },
];

export function AdminShell() {
  return (
    <AdminGate>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight2">Admin</h1>

        {/* Mobile: horizontal scroll tab strip */}
        <nav className="flex gap-1 overflow-x-auto pb-1 md:hidden scrollbar-none">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                cn(
                  'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          {/* Desktop: vertical sidenav */}
          <aside className="hidden md:block">
            <nav className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    )
                  }
                >
                  {s.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
    </AdminGate>
  );
}
