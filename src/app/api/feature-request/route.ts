/**
 * Feature Request API Route
 *
 * Accepts POST with JSON body { name, email, phone?, feature }
 * Sends two emails in parallel:
 *  1. Team email → featurerequest@lensonwealth.com (critical — failure = 500)
 *  2. Confirmation → user's email (best-effort — failure still returns success)
 *
 * Uses Resend if RESEND_API_KEY is set.
 * Otherwise uses Nodemailer with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */

import { NextRequest, NextResponse } from 'next/server';

const FEATURE_REQUEST_EMAIL = 'featurerequest@lensonwealth.com';

type FeatureRequestBody = {
  name: string;
  email: string;
  phone?: string;
  feature: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Team email: dark-styled table */
function buildTeamEmailHtml(body: FeatureRequestBody): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; background: #0d1117; color: #f0f4f8; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h2 style="color: #3ecf8e; margin-bottom: 20px;">Feature Request</h2>
    <table style="border-collapse: collapse; width: 100%; background: #161c26; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Full Name</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(body.name)}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Email Address</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${escapeHtml(body.email)}</td></tr>
      <tr><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a8b8c8;"><strong>Phone Number</strong></td><td style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">${body.phone ? escapeHtml(body.phone) : '(not provided)'}</td></tr>
      <tr><td style="padding: 12px 16px; color: #a8b8c8;"><strong>Feature Details</strong></td><td style="padding: 12px 16px;"></td></tr>
    </table>
    <div style="margin-top: 16px; padding: 16px; background: #1e2733; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid #3ecf8e; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(body.feature)}</div>
  </div>
</body>
</html>
  `.trim();
}

/** User confirmation: LensOnWealth branded dark teal theme (from feature-request-confirmation-email.html) */
function buildConfirmationEmailHtml(body: FeatureRequestBody): string {
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
  const year = now.getFullYear();
  const name = escapeHtml(body.name);
  const email = escapeHtml(body.email);
  const feature = escapeHtml(body.feature).replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feature Request Received – LensOnWealth</title>
</head>
<body style="margin:0; padding:0; background:#0d1117; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d1117;">
<tr>
<td align="center" style="padding:40px 20px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

<!-- TOP ACCENT BAR (3px gradient) -->
<tr>
<td style="height:3px; background:linear-gradient(90deg,#3ecf8e,#4f8ef7,#3ecf8e); border-radius:3px 3px 0 0;"></td>
</tr>

<!-- HEADER -->
<tr>
<td style="background:#161c26; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:32px 40px 28px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td>
<table cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="vertical-align:middle;">
<img src="https://lensonwealth.com/logo.png" alt="LensOnWealth" width="40" height="40" style="display:block; border-radius:10px;" />
</td>
<td style="padding-left:12px; vertical-align:middle;">
<div style="font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-0.3px;">LensOnWealth</div>
<div style="font-size:11px; color:#3ecf8e; letter-spacing:0.15em; text-transform:uppercase; margin-top:1px;">Clarity · Growth · Legacy</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
<div style="height:1px; background:rgba(255,255,255,0.07); margin:24px 0;"></div>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr>
<td style="background:rgba(62,207,142,0.12); border:1px solid rgba(62,207,142,0.25); border-radius:100px; padding:5px 14px;">
<span style="font-size:12px; color:#3ecf8e; font-weight:600; letter-spacing:0.04em; text-transform:uppercase;">✓ &nbsp;Request Received</span>
</td>
</tr>
</table>
<h1 style="margin:0 0 14px; font-size:26px; font-weight:700; color:#f0f4f8; line-height:1.2; letter-spacing:-0.4px;">
Hi ${name}, thanks for sharing your idea! 🎯
</h1>
<p style="margin:0; font-size:15px; color:#7a8a9a; line-height:1.7;">
We've received your feature request and our team will review it carefully. We'll reach out if we need more details — your input helps shape what we build next for Indian investors.
</p>
</td>
</tr>

<!-- YOUR REQUEST SECTION -->
<tr>
<td style="background:#0f1520; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:0 40px 32px;">
<div style="height:1px; background:rgba(255,255,255,0.05); margin-bottom:28px;"></div>
<p style="margin:0 0 14px; font-size:11px; font-weight:600; color:#3ecf8e; letter-spacing:0.12em; text-transform:uppercase;">Your Request</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="background:#161c26; border:1px solid rgba(255,255,255,0.08); border-left:3px solid #3ecf8e; border-radius:0 12px 12px 0; padding:20px 22px;">
<p style="margin:0; font-size:14px; color:#c8d8e8; line-height:1.75; font-style:italic;">
"${feature}"
</p>
</td>
</tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
<tr>
<td style="background:#161c26; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:16px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" style="vertical-align:top; padding-right:12px;">
<div style="font-size:10px; color:#3ecf8e; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px;">Submitted By</div>
<div style="font-size:13px; color:#f0f4f8; font-weight:500;">${name}</div>
<div style="font-size:12px; color:#7a8a9a; margin-top:2px;">${email}</div>
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
</td>
</tr>

<!-- WHAT HAPPENS NEXT -->
<tr>
<td style="background:#161c26; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:28px 40px;">
<p style="margin:0 0 16px; font-size:11px; font-weight:600; color:#a8b8c8; letter-spacing:0.12em; text-transform:uppercase;">What Happens Next</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="36" valign="top" style="padding-right:14px; padding-bottom:16px;">
<div style="width:28px; height:28px; background:rgba(62,207,142,0.12); border:1px solid rgba(62,207,142,0.25); border-radius:50%; text-align:center; line-height:28px; font-size:12px; font-weight:700; color:#3ecf8e;">1</div>
</td>
<td valign="top" style="padding-bottom:16px;">
<div style="font-size:13px; font-weight:600; color:#f0f4f8; margin-bottom:3px;">Team Review</div>
<div style="font-size:12px; color:#7a8a9a; line-height:1.5;">Our team reviews all feature requests and evaluates them against our roadmap.</div>
</td>
</tr>
<tr>
<td width="36" valign="top" style="padding-right:14px; padding-bottom:16px;">
<div style="width:28px; height:28px; background:rgba(79,142,247,0.12); border:1px solid rgba(79,142,247,0.25); border-radius:50%; text-align:center; line-height:28px; font-size:12px; font-weight:700; color:#4f8ef7;">2</div>
</td>
<td valign="top" style="padding-bottom:16px;">
<div style="font-size:13px; font-weight:600; color:#f0f4f8; margin-bottom:3px;">Prioritization</div>
<div style="font-size:12px; color:#7a8a9a; line-height:1.5;">High-impact requests get added to our public roadmap. Check back at lensonwealth.com/roadmap.</div>
</td>
</tr>
<tr>
<td width="36" valign="top" style="padding-right:14px;">
<div style="width:28px; height:28px; background:rgba(62,207,142,0.08); border:1px solid rgba(62,207,142,0.15); border-radius:50%; text-align:center; line-height:28px; font-size:12px; font-weight:700; color:#3ecf8e;">3</div>
</td>
<td valign="top">
<div style="font-size:13px; font-weight:600; color:#f0f4f8; margin-bottom:3px;">We'll Follow Up</div>
<div style="font-size:12px; color:#7a8a9a; line-height:1.5;">If we need clarifications or your request ships, we'll reach out at this email.</div>
</td>
</tr>
</table>
</td>
</tr>

<!-- CTA -->
<tr>
<td style="background:#0f1520; border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); padding:24px 40px; text-align:center;">
<a href="https://lensonwealth.com/roadmap" style="display:inline-block; background:linear-gradient(135deg,#3ecf8e,#2db87a); color:#0d1117; font-size:14px; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:10px; letter-spacing:0.01em;">
View Public Roadmap →
</a>
</td>
</tr>

<!-- BOTTOM BORDER -->
<tr>
<td style="height:1px; background:rgba(255,255,255,0.05);"></td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:#0d1117; border:1px solid rgba(255,255,255,0.05); border-top:none; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
<p style="margin:0 0 8px; font-size:13px; font-weight:600; color:#f0f4f8;">The LensOnWealth Team</p>
<p style="margin:0 0 12px; font-size:12px; color:#7a8a9a; line-height:1.6;">
Your clear view of complete wealth.<br>
Track stocks, mutual funds, and ETFs from all platforms in one unified dashboard.
</p>
<p style="margin:0; font-size:11px; color:#4a5a6a;">
Questions? Reply to this email or reach us at
<a href="mailto:support@lensonwealth.com" style="color:#3ecf8e; text-decoration:none;">support@lensonwealth.com</a>
</p>
<div style="height:1px; background:rgba(255,255,255,0.05); margin:16px 0;"></div>
<p style="margin:0; font-size:10px; color:#3a4a5a; line-height:1.6;">
You received this because you submitted a feature request at lensonwealth.com.<br>
© ${year} LensOnWealth. All rights reserved.
</p>
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

async function sendTeamEmail(body: FeatureRequestBody): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'LensOnWealth <featurerequest@lensonwealth.com>',
      to: [FEATURE_REQUEST_EMAIL],
      replyTo: body.email,
      subject: `[Feature Request] from ${body.name}`,
      html: buildTeamEmailHtml(body),
    });
    if (error) throw new Error(error.message || 'Failed to send team email');
  } else {
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS required for Nodemailer');
    }
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: user,
      to: FEATURE_REQUEST_EMAIL,
      replyTo: body.email,
      subject: `[Feature Request] from ${body.name}`,
      html: buildTeamEmailHtml(body),
    });
  }
}

async function sendConfirmationEmail(body: FeatureRequestBody): Promise<void> {
  const fromAddr = `LensOnWealth <${FEATURE_REQUEST_EMAIL}>`;
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'LensOnWealth <featurerequest@lensonwealth.com>',
      to: [body.email],
      subject: "We've received your feature request 🎯",
      html: buildConfirmationEmailHtml(body),
    });
    if (error) throw new Error(error.message || 'Failed to send confirmation');
  } else {
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: fromAddr,
      to: body.email,
      subject: "We've received your feature request 🎯",
      html: buildConfirmationEmailHtml(body),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeatureRequestBody;

    const name = body?.name?.trim();
    const email = body?.email?.trim();
    const feature = body?.feature?.trim();

    if (!name || !email || !feature) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and feature are required' },
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

    const payload: FeatureRequestBody = {
      name,
      email,
      phone: body.phone?.trim() || undefined,
      feature,
    };

    if (
      !process.env.RESEND_API_KEY &&
      !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.',
        },
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
          : 'Failed to send team email';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    if (confirmationResult.status === 'rejected') {
      console.error(
        '[feature-request] Confirmation email failed:',
        confirmationResult.reason
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[feature-request] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to send feature request';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
