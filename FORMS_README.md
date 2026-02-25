# LensOnWealth — Forms Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Feature Request Form](#feature-request-form)
3. [Feedback Form](#feedback-form)
4. [Shared Infrastructure](#shared-infrastructure)
5. [Email Configuration](#email-configuration)
6. [Environment Variables](#environment-variables)

---

## Overview

Two user-facing forms have been added to LensOnWealth:

| Form | Trigger Location | Sends To |
|---|---|---|
| Feature Request | `/roadmap` page — "Submit Feature Request" button | `featurerequest@lensonwealth.com` |
| Feedback | Footer — `MessageSquarePlus` icon (hover: "Submit Feedback Form") | `help@lensonwealth.com` |

Both forms:
- Work in **light and dark mode** (follow existing app theme tokens)
- Send **two emails simultaneously** — one to the team, one confirmation to the user
- Handle **loading, success, and error states** inline (no page reload)
- Use **Resend** as the email delivery service

---

## Feature Request Form

### Purpose
Collects product feature ideas from users on the public roadmap page.

### Files
```
src/components/FeatureRequestModal.tsx   — Modal UI component
src/app/api/feature-request/route.ts    — API route (POST)
```

### Fields
| Field | Type | Required |
|---|---|---|
| Full Name | Text input | ✅ Yes |
| Email Address | Email input | ✅ Yes |
| Phone Number | Tel input | No (optional) |
| Feature Details | Textarea | ✅ Yes |

### UI Behaviour
- Triggered by the "Submit Feature Request" button on `/roadmap`
- 2-column grid for Name + Email, full-width for Phone and Feature Details
- Submit button shows `"Sending..."` during API call
- On success: form replaced with success message — *"Request Received! Thanks for sharing your idea."*
- On error: inline message — *"Something went wrong. Please try again or email us at featurerequest@lensonwealth.com"*

### API Route — `POST /api/feature-request`

**Request body:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@email.com",
  "phone": "+91 98765 43210",
  "feature": "Add goal-based investing tracker..."
}
```

**Response:**
```json
{ "success": true }
```

**Emails sent:**

| | Team Email | User Confirmation |
|---|---|---|
| **To** | `featurerequest@lensonwealth.com` | User's submitted email |
| **From** | `LensOnWealth <featurerequest@lensonwealth.com>` | `LensOnWealth <featurerequest@lensonwealth.com>` |
| **Subject** | `[Feature Request] from {name}` | `We've received your feature request 🎯` |
| **Reply-To** | User's email | — |
| **Critical?** | ✅ Yes — 500 if fails | No — logs warning only |

**User confirmation email includes:**
- LensOnWealth logo (`https://lensonwealth.com/logo.png`)
- `"✓ Request Received"` teal pill badge
- Their feature request echoed back in a teal left-border blockquote
- Submitted by card (name, email, IST timestamp)
- 3-step "What Happens Next" section
- "View Public Roadmap →" CTA button

---

## Feedback Form

### Purpose
Collects any type of user feedback — bugs, payment issues, performance problems, suggestions, data issues, or general feedback.

### Files
```
src/components/FeedbackModal.tsx        — Modal UI component
src/app/api/feedback/route.ts           — API route (POST)
```

### Trigger
Footer → Contact section → `MessageSquarePlus` icon button
- `title="Submit Feedback Form"` (native browser tooltip on hover)
- Icon: `MessageSquarePlus` from `lucide-react` (w-4 h-4)

### Fields

**Category selector** — 6 tiles, single select (default: Bug / Error):
| Tile | Emoji | Active Accent |
|---|---|---|
| Bug / Error | 🐛 | Red |
| Payment | 💳 | Amber |
| Performance | ⚡ | Blue |
| Suggestion | 💡 | Teal (`#3ecf8e`) |
| Data Issue | 📊 | Purple |
| Other | 💬 | Neutral |

**Severity selector** — 4 horizontal pills, single select (default: Medium):
| Pill | Active Color |
|---|---|
| 😐 Low | Teal |
| 😟 Medium | Amber |
| 😡 High | Orange |
| 🚨 Critical | Red |

**Input fields:**
| Field | Type | Required |
|---|---|---|
| Full Name | Text input | ✅ Yes |
| Email | Email input | ✅ Yes |
| Subject | Text input | ✅ Yes |
| Description | Textarea | ✅ Yes |
| Screenshot | File input (PNG/JPG ≤ 5MB) | No (optional) |

### UI Behaviour
- Name + Email side by side (2-col grid)
- Dashed upload zone for screenshot with 📎 icon
- Submit button shows `"Sending..."` during API call
- On success: inline success state
- On error: `"Something went wrong. Please try again or email us at help@lensonwealth.com"`

### API Route — `POST /api/feedback`

**Request body:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@email.com",
  "category": "Bug / Error",
  "severity": "High",
  "subject": "NAV not updating for HDFC Flexi Cap Fund",
  "description": "The NAV has not refreshed since..."
}
```

**Response:**
```json
{ "success": true }
```

**Emails sent:**

| | Team Email | User Confirmation |
|---|---|---|
| **To** | `help@lensonwealth.com` | User's submitted email |
| **From** | `LensOnWealth <help@lensonwealth.com>` | `LensOnWealth <help@lensonwealth.com>` |
| **Subject** | `[{category}] {subject} — from {name}` | `We've received your feedback — LensOnWealth` |
| **Reply-To** | User's email | — |
| **Critical?** | ✅ Yes — 500 if fails | No — logs warning only |

**User confirmation email includes:**
- LensOnWealth logo (`https://lensonwealth.com/logo.png`)
- `"✓ Feedback Received"` teal pill badge
- Colored category badge + colored severity badge
- Subject + description echoed back in teal left-border blockquote
- Submitted by card (name, email, IST timestamp)
- Closing: *"Our team typically responds within 1–2 business days. You can reply to this email directly."*

---

## Shared Infrastructure

### Email Service — Resend

Both API routes use **Resend** for email delivery.

- Package: `resend` (npm)
- Domain verified: `lensonwealth.com` ✅
- DNS records added via Porkbun ✅
- Both DKIM and SPF verified ✅

### Email sending pattern (both routes):
```typescript
const [teamResult, userResult] = await Promise.allSettled([
  resend.emails.send({ /* team email */ }),
  resend.emails.send({ /* user confirmation */ }),
]);

// Team email is critical
if (teamResult.status === 'rejected' || teamResult.value?.error) {
  return NextResponse.json({ success: false }, { status: 500 });
}

// User confirmation is non-critical — log warning only
if (userResult.status === 'rejected') {
  console.warn('Confirmation email failed (non-critical)');
}

return NextResponse.json({ success: true });
```

### Timestamp formatting (IST):
```typescript
const submittedAt = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});
```

---

## Email Configuration

### Sending addresses
| Address | Used For |
|---|---|
| `featurerequest@lensonwealth.com` | Feature request emails (team + user) |
| `help@lensonwealth.com` | Feedback emails (team + user) |
| `support@lensonwealth.com` | General support (existing, unchanged) |

### Cron schedule (optional — for monitoring)
If you want to add a daily check to Vercel cron:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/mf/isin/backfill",
      "schedule": "30 19 * * *"
    }
  ]
}
```

---

## Environment Variables

| Variable | Used In | Where to get |
|---|---|---|
| `RESEND_API_KEY` | Both API routes | Resend dashboard → API Keys |

Add to:
- **Vercel**: Settings → Environment Variables → all three environments
- **Local**: `.env.local`

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

---

## Future Enhancements

- **Screenshot attachment** — wire up file upload to Resend's attachment API or Supabase Storage, then include as email attachment
- **Rate limiting** — add simple IP-based rate limiting on both API routes to prevent spam
- **Admin dashboard** — log all submissions to a Supabase table for tracking and analytics
- **Auto-reply threading** — use Resend's `headers` to set `Message-ID` so replies thread correctly in Gmail

---

**Last Updated:** February 2026
**Version:** 1.0.0
