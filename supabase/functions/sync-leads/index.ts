import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const body = part.body as Record<string, unknown> | undefined;
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
  const best = clean.find(l => /download|export|report|\.xlsx|\.xls/i.test(l));
  if (best) return best;
  if (clean.length) return clean[0];
  throw new Error('No download link found in email body.');
}

/** Encode ArrayBuffer to base64 in Deno. */
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Mode: 'fetch-file' downloads & returns file as base64; 'upsert' saves parsed rows
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }
  const mode = (body.mode as string) ?? 'fetch-file';

  try {
    const missing = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
      .filter((k) => !Deno.env.get(k));
    if (missing.length) throw new Error(`Missing secrets: ${missing.join(', ')}`);

    if (mode === 'upsert') {
      const rows = body.rows as Record<string, unknown>[];
      if (!rows?.length) throw new Error('No rows provided');

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { error } = await supabase
        .from('leads')
        .upsert(rows, { onConflict: 'quote_number', ignoreDuplicates: false });
      if (error) throw error;

      await supabase.from('lead_sync_logs').insert({
        total_processed: rows.length,
        email_subject: body.email_subject ?? null,
      });

      return Response.json({ success: true, total: rows.length }, { headers: corsHeaders });
    }

    // Default: fetch-file — find Gmail email, download file server-side, return base64
    const token   = await getAccessToken();
    const message = await findLatestReportEmail(token);
    const subject = (message.payload?.headers as {name:string;value:string}[] | undefined)
      ?.find((h: {name:string;value:string}) => h.name === 'Subject')?.value ?? 'Unknown';
    const links   = extractLinks(message);
    const dlLink  = pickDownloadLink(links);

    // Download server-side to avoid CORS issues in the browser
    const fileRes = await fetch(dlLink);
    if (!fileRes.ok) throw new Error(`File download failed (${fileRes.status}): ${dlLink}`);
    const fileBuffer = await fileRes.arrayBuffer();
    const fileBase64 = bufferToBase64(fileBuffer);

    return Response.json(
      { file_base64: fileBase64, email_subject: subject },
      { headers: corsHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
