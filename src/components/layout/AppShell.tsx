import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ToastViewport } from '@/components/ui/toast';

export function AppShell() {
  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/30">
      <TopNav />
      <main className="container max-w-6xl py-10">
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
