const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const emailHtml = (name: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>You're on the list 💜</title></head>
<body style="margin:0;padding:0;background-color:#0f0020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0020;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#1e0545;border-radius:16px;border:1px solid rgba(255,255,255,0.12);overflow:hidden;">

        <!-- Header stripe -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:6px 0;"></td></tr>

        <!-- Logo -->
        <tr><td align="center" style="padding:36px 32px 0;">
          <p style="margin:0;font-size:28px;font-weight:800;color:#c084fc;letter-spacing:-0.5px;">Violets &amp; Vibes</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;">WOMEN-CENTERED &nbsp;·&nbsp; SAFE &nbsp;·&nbsp; REAL</p>
        </td></tr>

        <!-- Heart -->
        <tr><td align="center" style="padding:24px 0 0;font-size:48px;">💜</td></tr>

        <!-- Headline -->
        <tr><td align="center" style="padding:20px 32px 0;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">You're on the Founding Circle waitlist!</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:16px 32px 0;">
          <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.75);line-height:1.65;">
            Hi ${name},<br><br>
            Thank you for joining. You're one of the first to help shape Violets &amp; Vibes — a safer, women-centered space for friendship, dating, and community.
          </p>
        </td></tr>

        <!-- What's next box -->
        <tr><td style="padding:20px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(124,58,237,0.25);border:1px solid rgba(192,132,252,0.3);border-radius:12px;padding:20px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#c084fc;letter-spacing:0.06em;text-transform:uppercase;">What happens next</p>
              <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">✦ &nbsp;We'll reach out when early access opens</p>
              <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">✦ &nbsp;Founding members get a special badge and invite passes</p>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;">✦ &nbsp;You'll have a voice in shaping how the community grows</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:28px 32px 0;">
          <a href="https://violetsandvibes.com/waitlist/" style="display:inline-block;background:linear-gradient(135deg,#9333ea,#db2777);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:50px;">
            Share with someone who belongs here
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 32px 32px;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6;text-align:center;">
            No spam, ever. We'll only use your email for Violets &amp; Vibes updates, early access, and waitlist invitations.<br>
            <a href="https://violetsandvibes.com/terms" style="color:rgba(192,132,252,0.7);text-decoration:underline;">Terms</a>
            &nbsp;·&nbsp; &copy; 2026 Violets &amp; Vibes
          </p>
        </td></tr>

        <!-- Bottom stripe -->
        <tr><td style="background:linear-gradient(135deg,#db2777,#7c3aed);padding:6px 0;"></td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { name, email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY secret not set');
    }

    const displayName = (name ?? '').trim() || 'there';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Violets & Vibes <hello@violetsandvibes.com>',
        to: [email],
        subject: "You're on the Founding Circle waitlist 💜",
        html: emailHtml(displayName),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error: ${body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
