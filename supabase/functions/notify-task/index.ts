import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSIGNEE_EMAILS: Record<string, string> = {
  Alex:  'alex@sekamoving.com',
  Terry: 'terry@sekamoving.com',
  Chris: 'chris@sekamoving.com',
  Rob:   'rob@sekamoving.com',
};

interface NotifyRequest {
  assignee: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  dueDate?: string | null;
  assignedBy?: string | null;
  isUpdate: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    const body: NotifyRequest = await req.json();
    const { assignee, taskTitle, taskDescription, priority, dueDate, assignedBy, isUpdate } = body;

    const toEmail = ASSIGNEE_EMAILS[assignee];
    if (!toEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    const priorityColor: Record<string, string> = {
      low: '#94a3b8',
      medium: '#60a5fa',
      high: '#f59e0b',
      urgent: '#ef4444',
    };
    const color = priorityColor[priority] ?? '#94a3b8';
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
    const action = isUpdate ? 'reassigned to you' : 'assigned to you';
    const subject = isUpdate
      ? `Task reassigned: ${taskTitle}`
      : `New task assigned: ${taskTitle}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td style="background:#000;border-radius:16px 16px 0 0;padding:24px 28px;">
          <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Seka Moving</span>
          <span style="color:#666;font-size:14px;margin-left:8px;">Task Board</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:28px;">
          <p style="margin:0 0 6px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
            Task ${action}
          </p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#09090b;line-height:1.3;">
            ${taskTitle}
          </h1>

          ${taskDescription ? `
          <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;background:#f4f4f5;border-radius:10px;padding:14px 16px;">
            ${taskDescription}
          </p>` : ''}

          <!-- Meta -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding-right:24px;padding-bottom:10px;">
                <span style="font-size:12px;color:#71717a;display:block;margin-bottom:2px;">Priority</span>
                <span style="display:inline-block;background:${color}22;color:${color};font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;">
                  ${priorityLabel}
                </span>
              </td>
              ${dueDate ? `
              <td style="padding-bottom:10px;">
                <span style="font-size:12px;color:#71717a;display:block;margin-bottom:2px;">Due date</span>
                <span style="font-size:13px;font-weight:600;color:#09090b;">
                  ${new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </td>` : ''}
            </tr>
            ${assignedBy ? `
            <tr>
              <td colspan="2" style="padding-bottom:6px;">
                <span style="font-size:12px;color:#71717a;">Assigned by </span>
                <span style="font-size:12px;font-weight:600;color:#09090b;">${assignedBy}</span>
              </td>
            </tr>` : ''}
          </table>

          <p style="margin:0;font-size:13px;color:#a1a1aa;">
            Log in to Seka Quote to view and update this task.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f4f4f5;border-radius:0 0 16px 16px;padding:16px 28px;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">Seka Moving · Internal task notification</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Seka Tasks <noreply@sekamoving.com>',
        to: toEmail,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
