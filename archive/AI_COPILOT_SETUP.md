# AI Copilot Setup Guide

## Overview

The WealthLens Copilot is now powered by **OpenAI GPT-4o-mini** to provide intelligent, personalized responses about your portfolio. The AI uses your actual portfolio data to answer questions naturally.

## Quick Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (it starts with `sk-`)
5. **Important**: Save it immediately - you won't see it again!

### 2. Add Environment Variables

Add these to your `.env.local` file in the project root:

```env
# OpenAI Configuration (for AI Copilot)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Note**: If you don't have a `.env.local` file, create one:

```bash
# Create the file
touch .env.local

# Add the variables (edit manually or use the template above)
```

### 3. Restart Your Dev Server

After adding environment variables, restart your development server:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## How It Works

### With OpenAI (AI-Powered)

When `OPENAI_API_KEY` is configured:
- ✅ Uses GPT-4o-mini to generate natural, personalized responses
- ✅ Answers ANY portfolio question (not just templates)
- ✅ Uses your actual portfolio data (holdings, allocation, risk, goals)
- ✅ Maintains compliance guardrails (no investment advice)
- ✅ Costs ~$0.15-0.30 per 1000 queries

### Without OpenAI (Fallback Mode)

If `OPENAI_API_KEY` is not set:
- ✅ Still works with template-based responses
- ✅ Handles common questions (risk, goals, daily movement)
- ⚠️ Limited to predefined question types
- ⚠️ Generic responses for complex queries

## Model Options

You can use different OpenAI models by changing `OPENAI_MODEL`:

```env
# Cost-effective (Recommended)
OPENAI_MODEL=gpt-4o-mini

# Better quality (Higher cost)
OPENAI_MODEL=gpt-4-turbo

# Most capable (Highest cost)
OPENAI_MODEL=gpt-4o
```

**Cost Comparison** (approximate per 1000 queries):
- `gpt-4o-mini`: $0.15-0.30
- `gpt-4-turbo`: $10-30
- `gpt-4o`: $20-60

## Testing

After setup, test the AI Copilot:

1. Open your dashboard
2. Click the **"Help"** button in the header (or floating button)
3. Try asking:
   - "What's my sector exposure?"
   - "How are my mutual funds performing?"
   - "Explain my asset allocation"
   - "What are the risks in my portfolio?"
   - "How does my portfolio compare to recommended allocations?"

## Troubleshooting

### "OpenAI not configured" warning

**Problem**: Console shows warning about OpenAI not being configured.

**Solution**: 
- Check that `OPENAI_API_KEY` is in `.env.local`
- Make sure you restarted the dev server after adding it
- Verify the key starts with `sk-` and is correct

### API Errors

**Problem**: Getting OpenAI API errors in console.

**Possible causes**:
1. **Invalid API Key**: Check that your key is correct
2. **Insufficient Credits**: Add credits to your OpenAI account
3. **Rate Limits**: You've hit OpenAI's rate limits (wait a bit)
4. **Network Issues**: Check your internet connection

**Solution**: Check the error message in console for details. The system will automatically fall back to template responses on API errors.

### Still Getting Template Responses

**Problem**: Copilot still uses templates even with API key set.

**Check**:
1. Is the API key in `.env.local` (not `.env`)?
2. Did you restart the dev server?
3. Check console for API errors
4. Verify the key works: Try making a simple OpenAI API call

### System Prompt Not Found Warning

**Problem**: Console warns about system prompt file not found.

**Solution**: The system will use a built-in fallback prompt. To use the full prompt:
- Ensure `ai/copilot/system_prompt.txt` exists
- The file should be in the project root under `ai/copilot/`

## Cost Management

### Monitor Usage

Check your OpenAI usage:
1. Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Monitor daily/monthly spending
3. Set up billing alerts

### Reduce Costs

- Use `gpt-4o-mini` (most cost-effective)
- Implement rate limiting for users
- Cache common responses
- Use fallback templates for simple queries

### Estimated Monthly Cost

For a small app with ~1000 queries/day:
- With `gpt-4o-mini`: ~$5-10/month
- With `gpt-4-turbo`: ~$300-900/month
- With `gpt-4o`: ~$600-1800/month

## Advanced Configuration

### Custom System Prompt

Edit `ai/copilot/system_prompt.txt` to customize the AI's behavior, tone, and rules.

### Adjust Temperature

In `src/app/api/copilot/query/route.ts`, modify the `temperature` parameter:

```typescript
const completion = await openai.chat.completions.create({
  model: OPENAI_MODEL,
  messages: [...],
  temperature: 0.7,  // 0.0 = deterministic, 1.0 = creative
  max_tokens: 600,
});
```

### Adjust Max Tokens

Control response length:

```typescript
max_tokens: 600,  // Shorter = cheaper, Longer = more detailed
```

## Compliance & Safety

The AI Copilot includes multiple safety layers:

1. **Pre-LLM Guardrails**: Blocks advice and prediction requests
2. **System Prompt**: Enforces compliance rules
3. **Post-LLM Guardrails**: Cleans responses for safety

All responses are logged to `copilot_sessions` table for audit.

## Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify environment variables are set correctly
3. Test OpenAI API key independently
4. Check OpenAI status page for outages

For questions or issues, refer to the main README or project documentation.
