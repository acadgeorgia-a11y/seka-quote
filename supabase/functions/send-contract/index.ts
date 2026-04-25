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

    const { customerEmail, customerName, signingUrl, jobNumber } = await req.json();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Seka Moving <onboarding@resend.dev>',
        to: customerEmail,
        subject: 'Your moving contract is ready to sign',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#000;border-radius:16px 16px 0 0;padding:24px 28px;">
          <span style="color:#fff;font-size:18px;font-weight:700;">Seka Moving</span>
        </td></tr>
        <tr><td style="background:#fff;padding:28px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#09090b;">Contract Ready to Sign</h1>
          <p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">Hi ${customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
            Your moving contract${jobNumber ? ` for job #${jobNumber}` : ''} is ready for your signature. Please click the button below to review and sign.
          </p>
          <a href="${signingUrl}" style="display:inline-block;background:#171717;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
            Review &amp; Sign Contract →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;">
            Or copy this link: <a href="${signingUrl}" style="color:#171717;">${signingUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f4f4f5;border-radius:0 0 16px 16px;padding:16px 28px;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">Seka Moving · This link is for your use only.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
