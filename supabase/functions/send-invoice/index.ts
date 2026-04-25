import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    const { invoice, pdfBase64 } = await req.json();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Seka Moving <onboarding@resend.dev>',
        to: invoice.customer_email,
        subject: `Invoice ${invoice.invoice_number} from Seka Moving`,
        html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
  <h2 style="margin:0 0 8px;font-size:20px;color:#09090b;">Invoice ${invoice.invoice_number}</h2>
  <p style="margin:0 0 20px;color:#71717a;font-size:14px;">Hi ${invoice.customer_name},</p>
  <p style="margin:0 0 20px;color:#3f3f46;font-size:15px;">Please find your invoice attached. Total: <strong>$${invoice.total.toFixed(2)}</strong></p>
  <p style="margin:0;color:#a1a1aa;font-size:13px;">Thank you for choosing Seka Moving.</p>
</div>`,
        attachments: [{
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        }],
      }),
    });

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
