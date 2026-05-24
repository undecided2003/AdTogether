export interface ResendEmailOptions {
  apiKey: string;
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendResendEmail(options: ResendEmailOptions) {
  const { apiKey, from, to, subject, html, text } = options;

  if (!apiKey) {
    console.warn('[Resend] API key not configured; email not sent.');
    return false;
  }

  const fromAddress = from || process.env.RESEND_FROM_EMAIL || 'no-reply@adtogether.com';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Resend] email send failed', response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Resend] email send error', error);
    return false;
  }
}
