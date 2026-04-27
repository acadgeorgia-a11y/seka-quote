import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';
import { listSyncLogs } from '@/lib/supabase/queries/leads';
import { toast } from '@/components/ui/toast';
import type { LeadSyncLog } from '@/lib/supabase/types';

type Likelihood = 'booked' | 'lost' | 'pending';

function mapLikelihood(raw: string): Likelihood {
  const s = raw.toLowerCase().trim();
  if (s.startsWith('bad') || s.includes('lost')) return 'lost';
  if (s === 'closed' || s === 'completed') return 'booked';
  return 'pending';
}

const PATTERNS: [RegExp, string][] = [
  [/quote.*#|quote.*num|job.*#/i,       'quote_number'],
  [/branch.*name|branch/i,              'branch_name'],
  [/^status$/i,                         'status_raw'],
  [/service.*type/i,                    'service_type'],
  [/volume.*weight/i,                   'volume_weight'],
  [/received.*at/i,                     'received_at'],
  [/service.*date/i,                    'service_date'],
  [/quote.*sent/i,                      'quote_sent_at'],
  [/sales.*person|salesperson/i,        'sales_person'],
  [/^estimator$/i,                      'estimator'],
  [/move.*coord|coordinator/i,          'move_coordinator'],
  [/time.*to.*contact/i,                'time_to_contact'],
  [/last.*comm/i,                       'last_communication_at'],
  [/referral.*source|lead.*source/i,    'referral_source'],
  [/estimated.*revenue|est.*revenue/i,  'estimated_revenue'],
];

function matchHeader(h: string): string | null {
  for (const [re, field] of PATTERNS) {
    if (re.test(String(h).trim())) return field;
  }
  return null;
}

function toIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toDateOnly(val: unknown): string | null {
  const iso = toIso(val);
  return iso != null ? (iso.split('T')[0] ?? null) : null;
}

function toMoney(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function parseExcel(buffer: ArrayBuffer) {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ws   = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => matchHeader(String(h ?? '')));
  const colOf   = (field: string) => headers.indexOf(field);
  const now     = new Date().toISOString();

  return rows.slice(1)
    .filter((row: unknown[]) => {
      const i = colOf('quote_number');
      return i >= 0 && row[i] != null;
    })
    .map((row: unknown[]) => {
      const r   = row;
      const get = (f: string) => { const i = colOf(f); return i >= 0 ? r[i] : null; };
      const statusRaw = String(get('status_raw') ?? '').trim();
      return {
        quote_number:          String(get('quote_number')).trim(),
        branch_name:           get('branch_name') ? String(get('branch_name')).trim() : null,
        status_raw:            statusRaw,
        likelihood:            mapLikelihood(statusRaw),
        service_type:          get('service_type') ? String(get('service_type')).trim() : null,
        volume_weight:         get('volume_weight') ? String(get('volume_weight')).trim() : null,
        received_at:           toIso(get('received_at')),
        service_date:          toDateOnly(get('service_date')),
        quote_sent_at:         toIso(get('quote_sent_at')),
        sales_person:          get('sales_person') ? String(get('sales_person')).trim() : null,
        estimator:             get('estimator') ? String(get('estimator')).trim() : null,
        move_coordinator:      get('move_coordinator') ? String(get('move_coordinator')).trim() : null,
        time_to_contact:       get('time_to_contact') ? String(get('time_to_contact')).trim() : null,
        last_communication_at: toIso(get('last_communication_at')),
        referral_source:       get('referral_source') ? String(get('referral_source')).trim() : null,
        estimated_revenue:     toMoney(get('estimated_revenue')),
        synced_at:             now,
        updated_at:            now,
      } as Record<string, unknown>;
    });
}

export function AdminLeadsSync() {
  const [logs, setLogs]       = useState<LeadSyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus]   = useState('');

  async function loadLogs() {
    try { setLogs(await listSyncLogs()); } catch { /* silent */ }
  }

  useEffect(() => { loadLogs(); }, []);

  async function runSync() {
    setSyncing(true);
    setStatus('Connecting to Gmail…');
    try {
      // Step 1: get download link from edge function
      const { data: linkData, error: linkErr } = await supabase.functions.invoke('sync-leads', {
        body: { mode: 'get-link' },
      });
      if (linkErr) throw linkErr;
      if (linkData?.error) throw new Error(linkData.error);

      setStatus('Downloading report…');
      // Step 2: download the Excel file in the browser
      const fileRes = await fetch(linkData.download_url);
      if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);
      const buffer = await fileRes.arrayBuffer();

      setStatus('Parsing Excel…');
      // Step 3: parse in the browser
      const rows = parseExcel(buffer);
      if (!rows.length) throw new Error('No leads found in the Excel file. Check column headers.');

      setStatus(`Saving ${rows.length} leads…`);
      // Step 4: send parsed rows to edge function for upsert
      const { data: upsertData, error: upsertErr } = await supabase.functions.invoke('sync-leads', {
        body: { mode: 'upsert', rows, email_subject: linkData.email_subject },
      });
      if (upsertErr) throw upsertErr;
      if (upsertData?.error) throw new Error(upsertData.error);

      toast({
        title: 'Sync complete',
        description: `${rows.length} leads imported from "${linkData.email_subject}"`,
        variant: 'success',
      });
      loadLogs();
    } catch (e) {
      toast({ title: 'Sync failed', description: (e as Error).message, variant: 'error' });
      loadLogs();
    } finally {
      setSyncing(false);
      setStatus('');
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
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={runSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            {status && <div className="text-xs text-muted-foreground">{status}</div>}
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="font-medium">Gmail Setup (one-time) ✓ Already configured</div>
        <ol className="space-y-4 text-sm text-muted-foreground list-none">
          {[
            { n: 1, title: 'GMAIL_CLIENT_ID', body: '✓ Set' },
            { n: 2, title: 'GMAIL_CLIENT_SECRET', body: '✓ Set' },
            { n: 3, title: 'GMAIL_REFRESH_TOKEN', body: '✓ Set' },
            { n: 4, title: 'GMAIL_SEARCH_QUERY (optional)', body: 'Set this in Supabase secrets if the default subject:"Lead Status" doesn\'t match your CRM email subject.' },
          ].map(step => (
            <li key={step.n} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {step.n}
              </span>
              <div>
                <div className="font-medium text-foreground font-mono text-xs">{step.title}</div>
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
