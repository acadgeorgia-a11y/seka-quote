import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GMAIL_CLIENT_ID')!,
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GMAIL_REFRESH_TOKEN')!,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Gmail token error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function findLatestReportEmail(token: string) {
  const q = Deno.env.get('GMAIL_SEARCH_QUERY') ?? 'subject:"Lead Status"';
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const list = await listRes.json();
  if (!list.messages?.length) throw new Error('No matching emails found. Check GMAIL_SEARCH_QUERY.');

  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${list.messages[0].id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return await msgRes.json();
}

function extractLinks(message: Record<string, unknown>): string[] {
  const links: string[] = [];

  function walkPart(part: Record<string, unknown>) {
    const mime = part.mimeType as string | undefined;
    const body  = part.body as Record<string, unknown> | undefined;
    if ((mime === 'text/html' || mime === 'text/plain') && body?.data) {
      const decoded = atob((body.data as string).replace(/-/g, '+').replace(/_/g, '/'));
      const re = /https?:\/\/[^\s"'<>]+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(decoded)) !== null) links.push(m[0]);
    }
    const parts = part.parts as Record<string, unknown>[] | undefined;
    if (parts) parts.forEach(walkPart);
  }

  const payload = message.payload as Record<string, unknown> | undefined;
  if (payload) walkPart(payload);
  return links;
}

function pickDownloadLink(links: string[]): string {
  const clean = links
    .map(l => l.replace(/&amp;/g, '&').replace(/['">\s]+$/, ''))
    .filter(l => !l.includes('unsubscribe') && !l.includes('mailto'));

  const best = clean.find(l =>
    /download|export|report|\.xlsx|\.xls/i.test(l),
  );
  if (best) return best;
  if (clean.length) return clean[0];
  throw new Error('No download link found in email body.');
}

type Likelihood = 'booked' | 'lost' | 'pending';
function mapLikelihood(raw: string): Likelihood {
  const s = raw.toLowerCase().trim();
  if (s.startsWith('bad') || s.includes('lost')) return 'lost';
  if (s === 'closed' || s === 'completed') return 'booked';
  return 'pending';
}

// Match Excel header (raw string) to our field name.
const PATTERNS: [RegExp, string][] = [
  [/quote.*#|quote.*num|job.*#/i,        'quote_number'],
  [/branch.*name|branch/i,               'branch_name'],
  [/^status$/i,                          'status_raw'],
  [/service.*type/i,                     'service_type'],
  [/volume.*weight/i,                    'volume_weight'],
  [/received.*at/i,                      'received_at'],
  [/service.*date/i,                     'service_date'],
  [/quote.*sent/i,                       'quote_sent_at'],
  [/sales.*person|salesperson/i,         'sales_person'],
  [/^estimator$/i,                       'estimator'],
  [/move.*coord|coordinator/i,           'move_coordinator'],
  [/time.*to.*contact/i,                 'time_to_contact'],
  [/last.*comm/i,                        'last_communication_at'],
  [/referral.*source|lead.*source/i,     'referral_source'],
  [/estimated.*revenue|est.*revenue/i,   'estimated_revenue'],
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
  return iso ? iso.split('T')[0] : null;
}

function toMoney(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function parseLeads(buffer: ArrayBuffer) {
  const wb   = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map((h) => matchHeader(String(h ?? '')));
  const colOf   = (field: string) => headers.indexOf(field);

  const now = new Date().toISOString();

  return rows
    .slice(1)
    .filter((row) => {
      const qnIdx = colOf('quote_number');
      return qnIdx >= 0 && (row as unknown[])[qnIdx] != null;
    })
    .map((row) => {
      const r = row as unknown[];
      const get = (f: string) => {
        const i = colOf(f);
        return i >= 0 ? r[i] : null;
      };
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
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const missing = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
      .filter((k) => !Deno.env.get(k));
    if (missing.length) {
      throw new Error(`Missing Supabase secrets: ${missing.join(', ')}`);
    }

    const token   = await getAccessToken();
    const message = await findLatestReportEmail(token);
    const subject = (message.payload?.headers as {name:string;value:string}[] | undefined)
      ?.find((h) => h.name === 'Subject')?.value ?? 'Unknown';

    const links  = extractLinks(message);
    const dlLink = pickDownloadLink(links);

    const fileRes = await fetch(dlLink);
    if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status}): ${dlLink}`);
    const contentType = fileRes.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      throw new Error('Download link returned HTML — it may require CRM login. Try updating GMAIL_SEARCH_QUERY or the link may have expired.');
    }
    const buffer = await fileRes.arrayBuffer();

    const leads = parseLeads(buffer);
    if (!leads.length) throw new Error('No leads parsed from the Excel file. Check column headers.');

    const { error: upsertErr } = await supabase
      .from('leads')
      .upsert(leads, { onConflict: 'quote_number', ignoreDuplicates: false });

    if (upsertErr) throw upsertErr;

    await supabase.from('lead_sync_logs').insert({
      total_processed: leads.length,
      email_subject: subject,
    });

    return Response.json(
      { success: true, total: leads.length, email_subject: subject },
      { headers: corsHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('lead_sync_logs').insert({ error: msg }).catch(() => {});
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
