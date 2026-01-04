# Supabase Setup Guide for WealthLens

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in / Create account
3. Click "New Project"
4. Choose organization, name your project (e.g., `wealthlensai`)
5. Set a strong database password (save it!)
6. Choose region closest to India (e.g., `ap-south-1` Mumbai)
7. Wait for project to be created (~2 minutes)

### 2. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Run the Database Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

You should see:
- ✅ All tables created
- ✅ RLS policies applied
- ✅ Triggers set up
- ✅ Sample assets seeded

### 5. Verify Setup

Check the **Table Editor** in Supabase Dashboard:

| Table | Should Have |
|-------|-------------|
| `users` | Empty (created on signup) |
| `portfolios` | Empty |
| `assets` | ~19 sample Indian assets |
| `holdings` | Empty |
| `portfolio_metrics` | Empty |
| `portfolio_insights` | Empty |
| `market_context` | 1 row (today's context) |
| `copilot_sessions` | Empty |
| `onboarding_snapshots` | Empty |

### 6. Enable Authentication

WealthLens supports two authentication methods:
- **Email/Password** - Traditional authentication
- **Mobile OTP** - India-friendly phone-based login

#### Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

#### Enable Phone/SMS Authentication (Mobile OTP)

1. Go to **Authentication** → **Providers**
2. Enable **Phone** provider
3. **Configure SMS Provider** (required for production):
   
   **Option A: Twilio (Recommended)**
   - Create a [Twilio account](https://www.twilio.com/)
   - Get your Account SID, Auth Token, and Phone Number
   - In Supabase: **Authentication** → **Settings** → **SMS Provider**
   - Select "Twilio" and enter your credentials
   
   **Option B: MessageBird**
   - Create a [MessageBird account](https://www.messagebird.com/)
   - Get your API key
   - Configure in Supabase SMS settings
   
   **Option C: Vonage**
   - Create a [Vonage account](https://www.vonage.com/)
   - Get your API key and secret
   - Configure in Supabase SMS settings

4. **Test Mode (Development)**:
   - For local development, you can enable "Phone Auth" without SMS provider
   - OTPs will be logged in Supabase Auth logs (not sent via SMS)
   - Go to **Authentication** → **Settings** → Enable "Enable phone confirmations"

5. **Rate Limiting**:
   - Supabase has built-in rate limiting for OTP requests
   - Default: 5 requests per hour per phone number
   - Adjust in **Authentication** → **Settings** if needed

#### Phone Auth Configuration Notes

```
⚠️ IMPORTANT: For production, you MUST configure an SMS provider.
Without it, OTPs cannot be delivered to users.

The app is configured to use SMS channel (not WhatsApp) for broader
compatibility with Indian mobile numbers.
```

## Schema Overview

```
auth.users (Supabase managed)
    ↓
public.users (investment profile)
    ↓
public.portfolios (multi-portfolio support)
    ↓
public.holdings ←→ public.assets
    ↓
public.portfolio_metrics (pre-computed)
    ↓
public.portfolio_insights (AI-generated)
    ↓
public.copilot_sessions (conversation logs)
```

## What Copilot Reads vs Writes

### 🧠 Copilot READS:
- `users` - Investment profile, risk tolerance
- `portfolios` - Portfolio metadata
- `holdings` - Asset ownership
- `portfolio_metrics` - Pre-computed intelligence
- `portfolio_insights` - Generated insights
- `market_context` - Daily market summary

### ✍️ Copilot WRITES:
- `copilot_sessions` - Conversation logs only

### 🚫 Copilot NEVER modifies:
- `holdings`
- `assets`
- `portfolio_metrics` (written by backend jobs)

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

```sql
-- Example: Users can only see their own portfolios
create policy "Users can access own portfolios"
  on portfolios for select
  using (auth.uid() = user_id);
```

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the full schema.sql
- Check for any SQL errors in the output

### "permission denied" error
- Check RLS policies are created
- Verify you're using the correct API key

### Data not showing up
- Check if RLS is blocking access
- Try with service_role key (bypasses RLS)

## Regenerating Types

After schema changes, regenerate TypeScript types:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

## Database Migrations

If you have an existing database and need to add phone authentication support:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the migration file: `supabase/migrations/001_add_phone_auth.sql`
3. This adds the `phone_number` column and updates the user creation trigger

## Next Steps

1. ✅ Schema deployed
2. ✅ Environment configured
3. ✅ Authentication configured (Email + Phone OTP)
4. → Create sample user for testing
5. → Wire API routes to Supabase

