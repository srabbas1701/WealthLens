/**
 * Feedback API Route
 *
 * Accepts POST with JSON body { name, email, category, severity, subject, description }
 * Sends two emails in parallel via Resend:
 *  1. Team email → help@lensonwealth.com (critical — failure = 500)
 *  2. Confirmation → user's email (best-effort — failure still returns success)
 */

import { NextRequest, NextResponse } from 'next/server';

const HELP_EMAIL = 'help@lensonwealth.com';

type FeedbackBody = {
  name: string;
  email: string;
  category: string;
  severity: string;
  subject: string;
  description: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Error',
  payment: 'Payment',
  performance: 'Performance',
  suggestion: 'Suggestion',
  data: 'Data Issue',
  other: 'Other',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  bug: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' },
  payment: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  performance: { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
  suggestion: { bg: 'rgba(62,207,142,0.2)', text: '#3ecf8e' },
  data: { bg: 'rgba(168,85,247,0.2)', text: '#a855f7' },
  other: { bg: 'rgba(156,163,175,0.2)', text: '#9ca3af' },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'rgba(62,207,142,0.2)', text: '#3ecf8e' },
  medium: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  high: { bg: 'rgba(249,115,22,0.2)', text: '#f97316' },
  critical: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatIstTimestamp(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timeStr =
    now.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }) + ' IST';
  return { dateStr, timeStr };
}

function buildTeamEmailHtml(body: FeedbackBody): string {
  const catColors = CATEGORY_COLORS[body.category] || CATEGORY_COLORS.other;
  const sevColors = SEVERITY_COLORS[body.severity] || SEVERITY_COLORS.medium;
  const { dateStr, timeStr } = formatIstTimestamp();
  const catLabel = CATEGORY_LABELS[body.category] || body.category;
  const sevLabel = SEVERITY_LABELS[body.severity] || body.severity;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; background: #0d1117; color: #f0f4f8; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h2 style="color: #3ecf8e; margin-bottom: 20px;">Feedback Received</h2>
    <table style="border-collapse: collapse; width: 100%; background: #161c26; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Category</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="background:${catColors.bg}; color:${catColors.text}; padding:4px 10px; border-radius:100px; font-size:12px; font-weight:600;">${escapeHtml(catLabel)}</span></td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Severity</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="background:${sevColors.bg}; color:${sevColors.text}; padding:4px 10px; border-radius:100px; font-size:12px; font-weight:600;">${escapeHtml(sevLabel)}</span></td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Name</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(body.name)}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Email</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(body.email)}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Subject</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(body.subject)}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Submitted</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${dateStr} · ${timeStr}</td></tr>
      <tr><td style="padding: 12px 16px; color: #a8b8c8;"><strong>Description</strong></td><td style="padding: 12px 16px;"></td></tr>
    </table>
    <div style="margin-top: 16px; padding: 16px; background: #1e2733; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid #3ecf8e; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(body.description).replace(/\n/g, '<br>')}</div>
  </div>
</body>
</html>
  `.trim();
}

function buildConfirmationEmailHtml(body: FeedbackBody): string {
  const { dateStr, timeStr } = formatIstTimestamp();
  const name = escapeHtml(body.name);
  const subject = escapeHtml(body.subject);
  const description = escapeHtml(body.description).replace(/\n/g, '<br>');
  const catColors = CATEGORY_COLORS[body.category] || CATEGORY_COLORS.other;
  const sevColors = SEVERITY_COLORS[body.severity] || SEVERITY_COLORS.medium;
  const catLabel = CATEGORY_LABELS[body.category] || body.category;
  const sevLabel = SEVERITY_LABELS[body.severity] || body.severity;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feedback Received – LensOnWealth</title>
</head>
<body style="margin:0; padding:0; background:#0d1117; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d1117;">
<tr>
<td align="center" style="padding:40px 20px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

<tr><td style="height:3px; background:linear-gradient(90deg,#3ecf8e,#4f8ef7,#3ecf8e); border-radius:3px 3px 0 0;"></td></tr>

<tr>
<td style="background:#161c26; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:32px 40px 28px;">
<table cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="vertical-align:middle;"><img src="https://lensonwealth.com/logo.png" alt="LensOnWealth" width="40" height="40" style="display:block; border-radius:10px;" /></td>
<td style="padding-left:12px; vertical-align:middle;">
<div style="font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-0.3px;">LensOnWealth</div>
<div style="font-size:11px; color:#3ecf8e; letter-spacing:0.15em; text-transform:uppercase; margin-top:1px;">CLARITY · GROWTH · LEGACY</div>
</td>
</tr>
</table>
<div style="height:1px; background:rgba(255,255,255,0.07); margin:24px 0;"></div>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr><td style="background:rgba(62,207,142,0.12); border:1px solid rgba(62,207,142,0.25); border-radius:100px; padding:5px 14px;"><span style="font-size:12px; color:#3ecf8e; font-weight:600; letter-spacing:0.04em; text-transform:uppercase;">✓ &nbsp;Feedback Received</span></td></tr>
</table>
<h1 style="margin:0 0 14px; font-size:26px; font-weight:700; color:#f0f4f8; line-height:1.2;">Hi ${name}, we've received your feedback!</h1>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
<tr><td style="padding-right:8px;"><span style="background:${catColors.bg}; color:${catColors.text}; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600;">${escapeHtml(catLabel)}</span></td><td><span style="background:${sevColors.bg}; color:${sevColors.text}; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:600;">${escapeHtml(sevLabel)}</span></td></tr>
</table>
</td>
</tr>

<tr>
<td style="background:#0f1520; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:0 40px 32px;">
<div style="height:1px; background:rgba(255,255,255,0.05); margin-bottom:28px;"></div>
<p style="margin:0 0 14px; font-size:11px; font-weight:600; color:#3ecf8e; letter-spacing:0.12em; text-transform:uppercase;">Your Feedback</p>
<p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#f0f4f8;">${subject}</p>
<div style="background:#161c26; border:1px solid rgba(255,255,255,0.08); border-left:3px solid #3ecf8e; border-radius:0 12px 12px 0; padding:20px 22px;">
<p style="margin:0; font-size:14px; color:#c8d8e8; line-height:1.75;">${description}</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
<tr>
<td style="background:#161c26; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:16px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" style="vertical-align:top; padding-right:12px;">
<div style="font-size:10px; color:#3ecf8e; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px;">Submitted By</div>
<div style="font-size:13px; color:#f0f4f8; font-weight:500;">${name}</div>
<div style="font-size:12px; color:#7a8a9a; margin-top:2px;">${escapeHtml(body.email)}</div>
</td>
<td width="50%" style="vertical-align:top; border-left:1px solid rgba(255,255,255,0.07); padding-left:20px;">
<div style="font-size:10px; color:#4f8ef7; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px;">Submitted On</div>
<div style="font-size:13px; color:#f0f4f8; font-weight:500;">${dateStr}</div>
<div style="font-size:12px; color:#7a8a9a; margin-top:2px;">${timeStr}</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
<p style="margin:24px 0 0; font-size:14px; color:#7a8a9a; line-height:1.6;">Our team typically responds within 1–2 business days. You can reply to this email directly.</p>
</td>
</tr>

<tr>
<td style="background:#0d1117; border:1px solid rgba(255,255,255,0.05); border-top:none; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
<p style="margin:0; font-size:13px; font-weight:600; color:#f0f4f8;">The LensOnWealth Team</p>
<p style="margin:4px 0 0; font-size:12px; color:#7a8a9a;"><a href="mailto:help@lensonwealth.com" style="color:#3ecf8e; text-decoration:none;">help@lensonwealth.com</a></p>
</td>
</tr>

</table>
</td>
</tr>
<tr><td style="height:40px;"></td></tr>
</table>
</body>
</html>
`.trim();
}

async function sendTeamEmail(body: FeedbackBody): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const catLabel = CATEGORY_LABELS[body.category] || body.category;
  const { error } = await resend.emails.send({
    from: `LensOnWealth <${HELP_EMAIL}>`,
    to: [HELP_EMAIL],
    replyTo: body.email,
    subject: `[${catLabel}] ${body.subject} — from ${body.name}`,
    html: buildTeamEmailHtml(body),
  });
  if (error) throw new Error(error.message || 'Failed to send team email');
}

async function sendConfirmationEmail(body: FeedbackBody): Promise<void> {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `LensOnWealth <${HELP_EMAIL}>`,
    to: [body.email],
    subject: "We've received your feedback — LensOnWealth",
    html: buildConfirmationEmailHtml(body),
  });
  if (error) throw new Error(error.message || 'Failed to send confirmation');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackBody;

    const name = body?.name?.trim();
    const email = body?.email?.trim();
    const category = body?.category?.trim();
    const severity = body?.severity?.trim();
    const subject = body?.subject?.trim();
    const description = body?.description?.trim();

    if (!name || !email || !category || !severity || !subject || !description) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const payload: FeedbackBody = {
      name,
      email,
      category,
      severity,
      subject,
      description,
    };

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const [teamResult, confirmationResult] = await Promise.allSettled([
      sendTeamEmail(payload),
      sendConfirmationEmail(payload),
    ]);

    if (teamResult.status === 'rejected') {
      const msg =
        teamResult.reason instanceof Error
          ? teamResult.reason.message
          : 'Failed to send';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    if (confirmationResult.status === 'rejected') {
      console.warn(
        '[feedback] Confirmation email failed:',
        confirmationResult.reason
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[feedback] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to send feedback';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
