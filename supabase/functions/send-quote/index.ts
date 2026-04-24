import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteLine {
  label: string;
  amount: number;
  detail?: string;
}

interface SendQuoteRequest {
  to: string;
  customerName: string;
  quoteCode: string;
  agentName: string;
  moveType: string;
  moveDate: string | null;
  originAddress: string;
  destinationAddress: string;
  crewSize: number;
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  morningTotal: number | null;
  afternoonTotal: number | null;
  monthlyStorage: { cuft: number; amount: number } | null;
  flags: string[];
}

function fmt(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function buildEmail(q: SendQuoteRequest): string {
  const moveTypeLabel: Record<string, string> = {
    local: 'Local Move',
    long_distance: 'Long Distance Move',
    out_of_state: 'Out-of-State Move',
  };

  const linesHtml = q.lines.map((l) => `
    <tr>
      <td style="padding:6px 0;color:#555;font-size:14px;">${l.label}${l.detail ? `<br><span style="font-size:12px;color:#999;">${l.detail}</span>` : ''}</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:14px;color:#333;">${fmt(l.amount)}</td>
    </tr>`).join('');

  const dualPriceHtml = q.morningTotal != null && q.afternoonTotal != null ? `
    <div style="margin:24px 0;display:flex;gap:12px;">
      <div style="flex:1;background:#f5f5f3;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:12px;color:#999;margin-bottom:6px;">Morning</div>
        <div style="font-size:24px;font-weight:600;color:#171717;">${fmt(q.morningTotal)}</div>
      </div>
      <div style="flex:1;background:#f5f5f3;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:12px;color:#999;margin-bottom:6px;">Afternoon</div>
        <div style="font-size:24px;font-weight:600;color:#171717;">${fmt(q.afternoonTotal)}</div>
      </div>
    </div>` : '';

  const storageHtml = q.monthlyStorage ? `
    <div style="margin-top:16px;background:#f0f4ff;border-radius:8px;padding:12px;display:flex;justify-content:space-between;">
      <div>
        <div style="font-size:13px;font-weight:600;color:#333;">Long-term storage</div>
        <div style="font-size:12px;color:#999;">${q.monthlyStorage.cuft} CuFT · charged monthly</div>
      </div>
      <div style="font-family:monospace;font-size:14px;color:#333;">${fmt(q.monthlyStorage.amount)}/mo</div>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#171717;padding:28px 32px;">
      <div style="font-size:22px;font-weight:600;color:#fff;letter-spacing:-0.02em;">Seka Moving</div>
      <div style="font-size:13px;color:#888;margin-top:4px;">Your quote is ready</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;margin:0 0 24px;">Hi ${q.customerName || 'there'},</p>
      <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.6;">
        Thank you for reaching out to Seka Moving. Here is your personalized quote prepared by ${q.agentName}.
      </p>

      <!-- Move details -->
      <div style="background:#f5f5f3;border-radius:10px;padding:16px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">${moveTypeLabel[q.moveType] ?? q.moveType}</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#999;padding:3px 0;width:80px;">From</td>
            <td style="font-size:13px;color:#333;padding:3px 0;">${q.originAddress}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#999;padding:3px 0;">To</td>
            <td style="font-size:13px;color:#333;padding:3px 0;">${q.destinationAddress}</td>
          </tr>
          ${q.moveDate ? `<tr>
            <td style="font-size:12px;color:#999;padding:3px 0;">Date</td>
            <td style="font-size:13px;color:#333;padding:3px 0;">${q.moveDate}</td>
          </tr>` : ''}
          <tr>
            <td style="font-size:12px;color:#999;padding:3px 0;">Crew</td>
            <td style="font-size:13px;color:#333;padding:3px 0;">${q.crewSize} movers</td>
          </tr>
        </table>
      </div>

      <!-- Dual price cards (local ≤400 CuFT) -->
      ${dualPriceHtml}

      <!-- Line items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        ${linesHtml}
        ${q.discountAmount > 0 ? `<tr>
          <td style="padding:6px 0;color:#555;font-size:14px;border-top:1px solid #eee;">Discount</td>
          <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:14px;color:#333;border-top:1px solid #eee;">-${fmt(q.discountAmount)}</td>
        </tr>` : ''}
      </table>

      <!-- Total -->
      <div style="border-top:2px solid #171717;padding-top:16px;display:flex;justify-content:space-between;align-items:baseline;">
        <div style="font-size:20px;font-weight:600;color:#171717;">Total</div>
        <div style="font-size:32px;font-weight:700;color:#171717;font-family:monospace;">${fmt(q.finalTotal)}</div>
      </div>

      ${storageHtml}

      <!-- CTA -->
      <div style="margin-top:32px;padding:20px;background:#f0f4ff;border-radius:10px;text-align:center;">
        <div style="font-size:14px;color:#333;margin-bottom:4px;">Ready to book or have questions?</div>
        <div style="font-size:13px;color:#555;">Reply to this email or call us — we're happy to help.</div>
      </div>

      <!-- Footer -->
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;text-align:center;">
        <div style="font-size:12px;color:#999;">Quote #${q.quoteCode} · Seka Moving · Brooklyn, NY</div>
        <div style="font-size:11px;color:#bbb;margin-top:4px;">This quote is valid for 7 days.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    const body: SendQuoteRequest = await req.json();

    if (!body.to) {
      return new Response(JSON.stringify({ error: 'Customer email is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const html = buildEmail(body);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Seka Moving <onboarding@resend.dev>',
        to: [body.to],
        subject: `Your Seka Moving Quote — ${body.quoteCode}`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message ?? 'Resend error');
    }

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
