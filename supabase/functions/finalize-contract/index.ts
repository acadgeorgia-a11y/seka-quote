import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const db = createClient(supabaseUrl, supabaseKey);
    const { contractId } = await req.json();

    const { data: contract } = await db.from('contracts').select('*').eq('id', contractId).single();
    if (!contract) throw new Error('Contract not found');

    if (apiKey && contract.customer_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Seka Moving <onboarding@resend.dev>',
          to: contract.customer_email,
          subject: 'Contract fully signed — Seka Moving',
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
  <h2 style="color:#09090b;">Contract Completed ✓</h2>
  <p style="color:#3f3f46;">Hi ${contract.customer_name},</p>
  <p style="color:#3f3f46;">Your moving contract has been signed by both parties. We look forward to your move!</p>
  <p style="color:#a1a1aa;font-size:13px;">Seka Moving · Thank you for choosing us.</p>
</div>`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
