import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { listSyncLogs } from '@/lib/supabase/queries/leads';
import { toast } from '@/components/ui/toast';
import type { LeadSyncLog } from '@/lib/supabase/types';

export function AdminLeadsSync() {
  const [logs, setLogs]       = useState<LeadSyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function loadLogs() {
    try { setLogs(await listSyncLogs()); } catch { /* silent */ }
  }

  useEffect(() => { loadLogs(); }, []);

  async function runSync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-leads');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: 'Sync complete',
        description: `${data.total} leads processed from "${data.email_subject}"`,
        variant: 'success',
      });
      loadLogs();
    } catch (e) {
      toast({ title: 'Sync failed', description: (e as Error).message, variant: 'error' });
      loadLogs();
    } finally {
      setSyncing(false);
    }
  }

  const lastLog = logs[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-3xl tracking-tight mb-1">Lead Sync</h2>
        <p className="text-muted-foreground text-sm">
          Connects to Gmail, finds the daily CRM Lead Status report, and imports all leads.
          New leads are added; existing ones are updated.
        </p>
      </div>

      {/* Status + trigger */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm mb-1">Last sync</div>
            {lastLog ? (
              <div className="text-sm text-muted-foreground">
                {new Date(lastLog.synced_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
                {lastLog.error
                  ? <span className="ml-2 text-red-500">— failed</span>
                  : <span className="ml-2 text-green-600 dark:text-green-400">— {lastLog.total_processed} leads</span>
                }
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Never synced</div>
            )}
          </div>
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="font-medium">Gmail Setup (one-time)</div>
        <ol className="space-y-4 text-sm text-muted-foreground list-none">
          {[
            {
              n: 1,
              title: 'Create Google Cloud credentials',
              body: 'Go to console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web app). Add your Supabase function URL as an authorized redirect URI.',
            },
            {
              n: 2,
              title: 'Enable Gmail API',
              body: 'In the same project go to APIs & Services → Library → search "Gmail API" → Enable.',
            },
            {
              n: 3,
              title: 'Get a refresh token',
              body: 'Use the Google OAuth 2.0 Playground (oauth2.googleapis.com/oauth2/v1/tokeninfo). Authorize with scope: https://www.googleapis.com/auth/gmail.readonly — copy the refresh token.',
            },
            {
              n: 4,
              title: 'Add secrets to Supabase',
              body: 'In your Supabase dashboard → Edge Functions → Manage secrets, add: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.',
            },
            {
              n: 5,
              title: '(Optional) Set the search query',
              body: 'Add secret GMAIL_SEARCH_QUERY to narrow which email is picked up. Default: subject:"Lead Status". Example: from:noreply@yourcrm.com subject:"Lead Status".',
            },
          ].map(step => (
            <li key={step.n} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {step.n}
              </span>
              <div>
                <div className="font-medium text-foreground">{step.title}</div>
                <div className="mt-0.5">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Sync history */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Recent syncs</div>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                {log.error
                  ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {log.error
                      ? <span className="text-red-500">{log.error}</span>
                      : <span>{log.total_processed} leads processed</span>
                    }
                  </div>
                  {log.email_subject && (
                    <div className="text-xs text-muted-foreground truncate">{log.email_subject}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {new Date(log.synced_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
