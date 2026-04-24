import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { ToastViewport } from '@/components/ui/toast';

export function AppShell() {
  return (
    <div className="min-h-full bg-background">
      <TopNav />
      <main className="container max-w-6xl py-6 pb-24 md:pb-10">
        <Outlet />
      </main>
      <BottomNav />
      <ToastViewport />
    </div>
  );
}
