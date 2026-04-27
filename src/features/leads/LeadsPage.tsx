import { useEffect, useState } from 'react';
import { BarChart2, List } from 'lucide-react';
import { listLeads } from '@/lib/supabase/queries/leads';
import { LeadsList } from './LeadsList';
import { LeadsDashboard } from './LeadsDashboard';
import { LoadingShimmer } from '@/components/shared/LoadingShimmer';
import { toast } from '@/components/ui/toast';
import type { Lead } from '@/lib/supabase/types';

type Tab = 'list' | 'dashboard';

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('list');

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .catch(e => toast({ title: 'Failed to load leads', description: e.message, variant: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <LoadingShimmer className="h-10 w-40" />
        <LoadingShimmer className="h-12 w-72" />
        <LoadingShimmer className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight2">Leads</h1>
        <div className="text-xs text-muted-foreground">{leads.length} total</div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {([['list', List, 'List'], ['dashboard', BarChart2, 'Dashboard']] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'list'      && <LeadsList      leads={leads} onLeadsChange={setLeads} />}
      {tab === 'dashboard' && <LeadsDashboard leads={leads} />}

      {leads.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No leads yet. Go to Admin → Lead Sync to connect Gmail and import leads.
        </div>
      )}
    </div>
  );
}
