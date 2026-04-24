import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ToastViewport } from '@/components/ui/toast';

export function AppShell() {
  return (
    <div className="min-h-full bg-background">
      <TopNav />
      <main className="container max-w-6xl py-8">
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
