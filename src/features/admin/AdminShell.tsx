import { NavLink, Outlet } from 'react-router-dom';
import { AdminGate } from './AdminGate';
import { cn } from '@/lib/utils';

const sections = [
  { to: '/admin/rates/local', label: 'Local rates' },
  { to: '/admin/rates/long-distance', label: 'Long-distance rates' },
  { to: '/admin/rates/addons', label: 'Add-ons' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/agents', label: 'Agents' },
];

export function AdminShell() {
  return (
    <AdminGate>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <h1 className="font-serif text-4xl tracking-tight2 mb-4">Admin</h1>
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
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
    </AdminGate>
  );
}
