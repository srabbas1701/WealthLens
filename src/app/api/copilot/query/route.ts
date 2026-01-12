import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCopilotContext, logCopilotSession } from '@/lib/db/copilot-context';
import type { 
  CopilotQueryRequest, 
  CopilotQueryResponse,
  Status,
  ConfidenceLevel
} from '@/types/copilot';
import type { CopilotContext } from '@/types/database';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/copilot/query
 * 
 * Core endpoint for all Copilot interactions.
 * 
 * Used by:
 * - Floating Copilot button
 * - Dashboard "Get Help"
 * - Contextual explain buttons
 * 
 * Backend Responsibilities:
 * 1. Fetch portfolio snapshot from Supabase
 * 2. Fetch risk profile from Supabase
 * 3. Fetch market context from Supabase
 * 4. Apply guardrails (pre-LLM)
 * 5. Inject system prompt
 * 6. Call LLM (OpenAI GPT-4o-mini)
 * 7. Post-process response (post-LLM guardrails)
 * 8. Log session to Supabase
 * 
 * Frontend does NONE of this - just passes intent and renders response.
 */

// =============================================================================
// OPENAI CLIENT INITIALIZATION
// =============================================================================

// Use require() for server-side dynamic loading in Next.js
let openaiClient: any = null;
let OpenAI: any = null;
let cachedApiKey: string | null = null; // Track which API key was used to initialize the client

/**
 * Read API key directly from .env.local file to avoid system env variable conflicts
 */
function getApiKeyFromEnvFile(): string | null {
  try {
    const envFilePath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envFilePath)) {
      console.warn('.env.local file not found at:', envFilePath);
      return null;
    }
    
    const envContent = fs.readFileSync(envFilePath, 'utf-8');
    // Match OPENAI_API_KEY=value - improved regex to handle end of file and multiline
    // Use a more robust pattern that captures everything after = until newline or end
    const lines = envContent.split(/\r?\n/);
    let key: string | null = null;
    
    for (const line of lines) {
      if (line.trim().startsWith('OPENAI_API_KEY=')) {
        // Split on = and take everything after it
        const parts = line.split('=', 2);
        if (parts.length === 2) {
          key = parts[1].trim();
          break;
        }
      }
    }
    
    if (key) {
      // Remove quotes if present
      key = key.replace(/^["']+|["']+$/g, '');
      // Remove any newlines that might be in the value
      key = key.replace(/\r?\n/g, '');
      // Remove invisible characters
      key = key.replace(/[\u200B-\u200D\uFEFF]/g, '');
      key = key.trim();
      
      if (key && key.startsWith('sk-')) {
        const keyPreview = key.length > 14 
          ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}`
          : '***';
        console.log('✅ Successfully loaded API key from .env.local file:', keyPreview, `(length: ${key.length})`);
        return key;
      } else {
        console.warn('API key found in .env.local but does not start with "sk-"');
      }
    } else {
      console.warn('OPENAI_API_KEY not found in .env.local file');
    }
    
    return null;
  } catch (error: any) {
    console.error('Failed to read .env.local file:', error.message);
    return null;
  }
}

function getOpenAIClient() {
  // ALWAYS read from .env.local file first - never use process.env as primary source
  // This ensures we use the correct key even if system environment variables are set
  let rawApiKey = getApiKeyFromEnvFile();
  
  // Only fallback to process.env if .env.local file doesn't exist or is unreadable
  if (!rawApiKey) {
    // Check if .env.local exists - if it does but key is missing, don't use process.env
    const envFilePath = path.join(process.cwd(), '.env.local');
    const envFileExists = fs.existsSync(envFilePath);
    
    if (!envFileExists) {
      // File doesn't exist, safe to use process.env as fallback
      rawApiKey = process.env.OPENAI_API_KEY || null;
      if (rawApiKey) {
        console.warn('⚠️ .env.local file not found - using API key from process.env (may be from system environment variables)');
        console.warn('⚠️ RECOMMENDATION: Create .env.local file with your API key for better control');
      }
    } else {
      // File exists but key not found - don't use process.env, it might be wrong
      console.warn('⚠️ .env.local file exists but OPENAI_API_KEY not found in it');
      console.warn('⚠️ NOT using process.env to avoid conflicts - please add OPENAI_API_KEY to .env.local');
      return null;
    }
  } else {
    // Successfully read from .env.local - log if process.env has different value
    const processEnvKey = process.env.OPENAI_API_KEY;
    if (processEnvKey && processEnvKey !== rawApiKey && !rawApiKey.includes(processEnvKey.substring(10, 30))) {
      console.log('ℹ️ Note: process.env.OPENAI_API_KEY exists but differs from .env.local - using .env.local (correct)');
    }
  }
  
  if (!rawApiKey) {
    console.warn('OPENAI_API_KEY not found in .env.local or environment variables');
    return null;
  }
  
  // More aggressive cleaning - remove quotes, whitespace, newlines, and invisible characters
  let apiKey = rawApiKey.trim()
    .replace(/^["']+|["']+$/g, '')  // Remove quotes from start/end
    .replace(/\r?\n/g, '')           // Remove newlines
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width spaces and other invisible chars
    .trim();                         // Final trim
  
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is empty after cleaning');
    return null;
  }
  
  // If client exists but API key changed, clear the cache and reinitialize
  if (openaiClient && cachedApiKey !== apiKey) {
    console.log('API key changed - clearing cached client and reinitializing');
    openaiClient = null;
    cachedApiKey = null;
  }
  
  if (openaiClient) {
    return openaiClient;
  }
  
  try {
    // Use require() for server-side - works better with Next.js route handlers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAIModule = require('openai');
    OpenAI = OpenAIModule.default || OpenAIModule;
    
    if (!OpenAI) {
      throw new Error('OpenAI module default export not found');
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format - should start with "sk-"');
      console.error('Key preview:', apiKey.substring(0, 10) + '...');
      return null;
    }
    
    // Log key info for debugging (first 10 and last 4 chars only for security)
    const keyPreview = apiKey.length > 14 
      ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
      : '***';
    console.log('Initializing OpenAI client - Key preview:', keyPreview, `(length: ${apiKey.length}, starts with: ${apiKey.substring(0, 7)})`);
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
    cachedApiKey = apiKey; // Remember which key was used
    return openaiClient;
  } catch (error: any) {
    console.error('Failed to load OpenAI module:', error.message || error);
    console.error('Error details:', {
      code: error.code,
      path: error.path,
      message: error.message,
    });
    return null;
  }
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// =============================================================================
// SYSTEM PROMPT LOADING
// =============================================================================

function getSystemPrompt(): string {
  try {
    // Try to read from ai/copilot/system_prompt.txt
    const promptPath = path.join(process.cwd(), 'ai', 'copilot', 'system_prompt.txt');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }
    
    // Fallback: Try from src directory (if different structure)
    const altPath = path.join(process.cwd(), 'src', '..', 'ai', 'copilot', 'system_prompt.txt');
    if (fs.existsSync(altPath)) {
      return fs.readFileSync(altPath, 'utf-8');
    }
    
    // Final fallback: Use inline prompt
    console.warn('System prompt file not found, using fallback');
    return `You are WealthLens, an investment intelligence assistant for Indian investors.

Your role is to explain portfolio behavior, risk, diversification, and goal alignment
in a calm, neutral, and easy-to-understand manner.

STRICT RULES — NEVER VIOLATE:
1. You NEVER provide buy, sell, or timing advice.
2. You NEVER predict stock prices, index movements, or future returns.
3. You NEVER recommend specific securities, funds, or financial products.
4. You NEVER use urgency, hype, or fear-based language.
5. You NEVER say "you should" or "I recommend" regarding investment decisions.
6. You NEVER provide tax advice — only explain general tax concepts.
7. You NEVER guarantee outcomes or use words like "definitely", "guaranteed", "certain".

ALWAYS consider the user's portfolio context when responding. Personalize your explanations
to their specific situation, goals, and comfort level with risk.

TONE: Calm, professional, and supportive. Like a knowledgeable friend, not a salesperson.
LANGUAGE: Simple English — explain concepts, don't assume knowledge. Use Indian context (₹, lakh, crore).
FORMAT: Maximum 3 short paragraphs for most responses. Lead with the most important point.`;
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return 'You are WealthLens, an investment intelligence assistant for Indian investors.';
  }
}

// =============================================================================
// GUARDRAILS (Pre-LLM)
// =============================================================================

interface GuardrailResult {
  safe: boolean;
  rewritten_question?: string;
  refusal_message?: string;
  triggered_rule?: string;
}

function applyPreLLMGuardrails(question: string): GuardrailResult {
  const lowerQuestion = question.toLowerCase();
  
  // Advice detection patterns
  const advicePatterns = [
    /should i (buy|sell|invest|exit|hold)/i,
    /is it (a good time|right time) to (buy|sell|invest)/i,
    /recommend|suggestion|advice/i,
    /what (stock|fund|share) should i/i,
    /which (stock|fund|share) (is best|to buy)/i,
  ];
  
  for (const pattern of advicePatterns) {
    if (pattern.test(question)) {
      return {
        safe: false,
        refusal_message: "I understand you're looking for guidance. While I can't recommend specific actions, I can help you understand the risks and trade-offs involved. Would you like me to explain how this relates to your portfolio and goals?",
        triggered_rule: 'advice_detection',
      };
    }
  }
  
  // Prediction detection
  const predictionPatterns = [
    /will (the market|nifty|sensex|stock) (go up|go down|rise|fall|crash)/i,
    /what will happen to/i,
    /predict|forecast|future price/i,
    /target price|price target/i,
  ];
  
  for (const pattern of predictionPatterns) {
    if (pattern.test(question)) {
      return {
        safe: false,
        refusal_message: "I'm not able to predict market movements or future prices. What I can do is help you understand your current portfolio, its risks, and how it aligns with your goals. Would that be helpful?",
        triggered_rule: 'prediction_detection',
      };
    }
  }
  
  // Panic detection - rewrite to calmer framing
  const panicPatterns = [
    /market (crash|crashing|collapsed)/i,
    /losing (everything|all my money)/i,
    /should i (panic|sell everything|exit now)/i,
    /is this the end/i,
  ];
  
  for (const pattern of panicPatterns) {
    if (pattern.test(question)) {
      return {
        safe: true,
        rewritten_question: 'Help me understand how recent market movements affect my portfolio and long-term goals.',
        triggered_rule: 'panic_rewrite',
      };
    }
  }
  
  return { safe: true };
}

// =============================================================================
// MOCK DATA (Fallback when Supabase data not available)
// =============================================================================

interface PortfolioContextMock {
  net_worth: number;
  risk_score: number;
  risk_label: string;
  goal_alignment: number;
  allocation: { asset: string; percentage: number }[];
  top_holdings: { name: string; type: string; value: number }[];
  active_insights: string[];
}

interface UserProfileMock {
  name: string;
  risk_comfort: string;
  goals: string[];
  time_horizon: string;
}

interface MarketContextMock {
  market_status: string;
  nifty_change: number;
  sector_movers: { sector: string; change: number }[];
}

function getMockPortfolioContext(): PortfolioContextMock {
  return {
    net_worth: 2485420,
    risk_score: 62,
    risk_label: 'Moderate',
    goal_alignment: 78,
    allocation: [
      { asset: 'Equity Mutual Funds', percentage: 45 },
      { asset: 'Index Funds', percentage: 20 },
      { asset: 'Debt Funds', percentage: 15 },
      { asset: 'PPF/EPF', percentage: 12 },
      { asset: 'Gold', percentage: 5 },
      { asset: 'Cash/FD', percentage: 3 },
    ],
    top_holdings: [
      { name: 'HDFC Flexi Cap Fund', type: 'Equity MF', value: 485230 },
      { name: 'Nifty 50 Index Fund', type: 'Index Fund', value: 372150 },
      { name: 'SBI Bluechip Fund', type: 'Equity MF', value: 298450 },
    ],
    active_insights: [
      'IT sector is 28% of your equity',
      'Tax harvesting opportunity available',
      'SIP step-up due',
    ],
  };
}

function getMockUserProfile(): UserProfileMock {
  return {
    name: 'Rahul',
    risk_comfort: 'balanced',
    goals: ['retirement', 'home'],
    time_horizon: '10+',
  };
}

function getMockMarketContext(): MarketContextMock {
  return {
    market_status: 'normal',
    nifty_change: -0.3,
    sector_movers: [
      { sector: 'IT', change: -1.2 },
      { sector: 'Banking', change: 0.5 },
      { sector: 'Pharma', change: 0.2 },
    ],
  };
}

// =============================================================================
// CONTEXT TRANSFORMATION (Supabase -> Response format)
// =============================================================================

function transformSupabaseContext(ctx: CopilotContext): {
  portfolio: PortfolioContextMock;
  user: UserProfileMock;
  market: MarketContextMock;
} {
  // Transform Supabase context to response format
  const portfolio: PortfolioContextMock = {
    net_worth: ctx.portfolio.total_value || 0,
    risk_score: ctx.metrics.risk_score || 0,
    risk_label: ctx.metrics.risk_label || 'Moderate',
    goal_alignment: ctx.metrics.goal_progress_pct || 0,
    allocation: [
      { asset: 'Equity', percentage: ctx.metrics.equity_pct || 0 },
      { asset: 'Debt', percentage: ctx.metrics.debt_pct || 0 },
      { asset: 'Gold', percentage: ctx.metrics.gold_pct || 0 },
      { asset: 'Cash', percentage: ctx.metrics.cash_pct || 0 },
      { asset: 'Hybrid', percentage: ctx.metrics.hybrid_pct || 0 },
    ].filter(a => a.percentage > 0),
    top_holdings: ctx.holdings
      .sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
      .slice(0, 5)
      .map(h => ({
        name: h.asset?.name || 'Unknown',
        type: h.asset?.asset_type || 'other',
        value: h.current_value || 0,
      })),
    active_insights: ctx.insights.map(i => i.summary),
  };

  const user: UserProfileMock = {
    name: ctx.user.full_name || 'Investor',
    risk_comfort: ctx.user.risk_label?.toLowerCase() || 'moderate',
    goals: ctx.user.primary_goal ? [ctx.user.primary_goal] : ['wealth building'],
    time_horizon: ctx.user.horizon_years ? `${ctx.user.horizon_years}` : '10+',
  };

  const market: MarketContextMock = ctx.marketContext
    ? {
        market_status: ctx.marketContext.market_mood || 'stable',
        nifty_change: ctx.marketContext.nifty_change || 0,
        sector_movers: (ctx.marketContext.affected_sectors || []).map(s => ({
          sector: s,
          change: 0,
        })),
      }
    : getMockMarketContext();

  return { portfolio, user, market };
}

// =============================================================================
// AI RESPONSE GENERATION (OpenAI Integration)
// =============================================================================

async function generateResponse(
  question: string,
  intent: string,
  portfolio: PortfolioContextMock,
  user: UserProfileMock,
  market: MarketContextMock
): Promise<{ summary: string; explanation: string; status: Status; confidence: ConfidenceLevel }> {
  
  // Get OpenAI client (using require for server-side)
  const openai = getOpenAIClient();
  
  // If OpenAI is not configured or failed to load, fall back to template responses
  if (!openai) {
    // Check both file and process.env for better error reporting
    const fileKey = getApiKeyFromEnvFile();
    const envKey = process.env.OPENAI_API_KEY;
    
    if (fileKey) {
      const keyPreview = fileKey.substring(0, 20) + '...';
      console.warn(`⚠️ OpenAI API key found in .env.local (${keyPreview}) but client failed to initialize - using fallback template responses`);
      console.warn('This might indicate an invalid API key or network issue. Check your API key at https://platform.openai.com/account/api-keys');
    } else if (envKey) {
      const keyPreview = envKey.trim().substring(0, 20) + '...';
      console.warn(`⚠️ OpenAI API key found in process.env (${keyPreview}) but .env.local file not found or unreadable - using fallback template responses`);
      console.warn('Recommendation: Use .env.local file instead of system environment variables');
    } else {
      console.warn('⚠️ OpenAI not configured - no API key found in .env.local or process.env - using fallback template responses');
      console.warn('To enable AI features, add OPENAI_API_KEY to .env.local file');
    }
    return generateFallbackResponse(question, intent, portfolio, user, market);
  }

  const systemPrompt = getSystemPrompt();
  
  // Build comprehensive context string from portfolio data
  const portfolioAllocation = portfolio.allocation
    .map(a => `${a.asset}: ${a.percentage}%`)
    .join(', ');
  
  const topHoldings = portfolio.top_holdings
    .slice(0, 5)
    .map(h => `${h.name} (${h.type}): ₹${(h.value / 100000).toFixed(2)}L`)
    .join(', ');
  
  const context = `PORTFOLIO CONTEXT:
- Net Worth: ₹${(portfolio.net_worth / 100000).toFixed(2)}L
- Risk Score: ${portfolio.risk_score}/100 (${portfolio.risk_label})
- Goal Alignment: ${portfolio.goal_alignment}%
- Asset Allocation: ${portfolioAllocation}
- Top Holdings: ${topHoldings}
- Active Insights: ${portfolio.active_insights.join('; ')}

USER PROFILE:
- Name: ${user.name}
- Risk Comfort Level: ${user.risk_comfort}
- Investment Goals: ${user.goals.join(', ')}
- Time Horizon: ${user.time_horizon} years

MARKET CONTEXT:
- Market Status: ${market.market_status}
- Nifty Change Today: ${market.nifty_change > 0 ? '+' : ''}${market.nifty_change}%
- Sector Movements: ${market.sector_movers.map(s => `${s.sector}: ${s.change > 0 ? '+' : ''}${s.change}%`).join(', ')}

USER QUESTION: ${question}
DETECTED INTENT: ${intent}

Please provide a helpful, personalized response that:
1. Directly addresses the user's question
2. Uses their actual portfolio data
3. Maintains a calm, educational tone
4. Avoids any investment advice or predictions
5. Provides a brief summary (first sentence) followed by a detailed explanation (2-3 paragraphs)

Format your response as:
SUMMARY: [One sentence summary]
EXPLANATION: [Detailed explanation in 2-3 paragraphs]`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.7,
      max_tokens: 600,
    } as any);

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Parse the response - look for SUMMARY and EXPLANATION markers
    let summary = '';
    let explanation = '';
    
    if (aiResponse.includes('SUMMARY:') && aiResponse.includes('EXPLANATION:')) {
      const parts = aiResponse.split('EXPLANATION:');
      summary = parts[0].replace('SUMMARY:', '').trim();
      explanation = parts[1]?.trim() || '';
    } else {
      // Fallback: split by first sentence/paragraph
      const sentences = aiResponse.split(/[.!?]\s+/);
      summary = sentences[0] || 'Here\'s what I can tell you about your portfolio.';
      explanation = sentences.slice(1).join('. ') || aiResponse;
    }
    
    // Determine status based on content (simple heuristic)
    let status: Status = 'no_action_required';
    const lowerResponse = aiResponse.toLowerCase();
    if (lowerResponse.includes('monitor') || lowerResponse.includes('watch')) {
      status = 'monitor';
    } else if (lowerResponse.includes('review') || lowerResponse.includes('consider') || lowerResponse.includes('attention')) {
      status = 'attention_required';
    }

    return {
      summary: summary.trim() || 'Here\'s what I can tell you about your portfolio.',
      explanation: explanation.trim() || aiResponse.trim(),
      status,
      confidence: 'high',
    };
    
  } catch (error: any) {
    // Handle specific API key errors
    if (error?.code === 'invalid_api_key' || error?.status === 401) {
      console.error('OpenAI API key error:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      console.error('Troubleshooting:');
      console.error('1. Check that OPENAI_API_KEY in .env.local starts with "sk-"');
      console.error('2. Ensure there are no extra spaces or newlines in the key');
      console.error('3. Verify the key is active at https://platform.openai.com/account/api-keys');
      console.error('4. Make sure you restarted the dev server after adding the key');
    } else {
      console.error('OpenAI API error:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });
    }
    
    // Fallback to template response on error
    return generateFallbackResponse(question, intent, portfolio, user, market);
  }
}

// =============================================================================
// FALLBACK TEMPLATE RESPONSES (When AI is unavailable)
// =============================================================================

function generateFallbackResponse(
  question: string,
  intent: string,
  portfolio: PortfolioContextMock,
  user: UserProfileMock,
  market: MarketContextMock
): { summary: string; explanation: string; status: Status; confidence: ConfidenceLevel } {
  
  if (intent === 'daily_movement' || question.toLowerCase().includes('today') || question.toLowerCase().includes('change')) {
    const movement = market.nifty_change >= 0 ? 'up' : 'down';
    const absChange = Math.abs(market.nifty_change);
    
    return {
      summary: `Your portfolio is slightly ${movement} today due to market movements.`,
      explanation: `Markets moved ${movement} ${absChange}% today${market.sector_movers.length > 0 ? `, primarily driven by ${market.sector_movers[0].sector} sector` : ''}. Your portfolio impact was limited due to diversification. Your asset allocation remains aligned with your ${user.risk_comfort} risk profile, and you're still on track for your ${user.goals.join(' and ')} goals.`,
      status: 'no_action_required',
      confidence: 'high',
    };
  }
  
  if (intent === 'risk_explanation' || question.toLowerCase().includes('risk')) {
    const equityAlloc = portfolio.allocation.find(a => a.asset.toLowerCase().includes('equity'));
    const debtAlloc = portfolio.allocation.find(a => a.asset.toLowerCase().includes('debt'));
    
    return {
      summary: `Your risk score is ${portfolio.risk_score}/100, classified as ${portfolio.risk_label}.`,
      explanation: `This means your portfolio has a balanced mix of growth and stability. With ${equityAlloc?.percentage || 0}% in equity and ${debtAlloc?.percentage || 0}% in debt, you're positioned for long-term growth while having some cushion during market volatility. This aligns well with your stated preference for ${user.risk_comfort} risk.`,
      status: 'no_action_required',
      confidence: 'high',
    };
  }
  
  if (intent === 'goal_progress' || question.toLowerCase().includes('goal') || question.toLowerCase().includes('track')) {
    return {
      summary: `You're ${portfolio.goal_alignment}% aligned with your goals.`,
      explanation: `Based on your ${user.time_horizon} year time horizon and current portfolio value of ₹${(portfolio.net_worth / 100000).toFixed(2)}L, you're making good progress toward your ${user.goals.join(' and ')} goals. Your SIPs are contributing steadily, and your asset allocation supports long-term growth.`,
      status: 'no_action_required',
      confidence: 'high',
    };
  }
  
  if (question.toLowerCase().includes('portfolio') || question.toLowerCase().includes('doing')) {
    return {
      summary: 'Your portfolio is well-balanced and aligned with your goals.',
      explanation: `Your portfolio of ₹${(portfolio.net_worth / 100000).toFixed(2)}L is diversified across ${portfolio.allocation.length} asset classes. Your largest allocation is ${portfolio.allocation[0]?.asset || 'Equity'} at ${portfolio.allocation[0]?.percentage || 0}%. Your risk score of ${portfolio.risk_score} matches your ${user.risk_comfort} profile. No immediate concerns to address.`,
      status: 'no_action_required',
      confidence: 'high',
    };
  }
  
  // Default response for general questions
  return {
    summary: 'Here\'s what I can tell you about your portfolio.',
    explanation: `Based on your current holdings, you have a diversified portfolio worth ₹${(portfolio.net_worth / 100000).toFixed(2)}L. Your risk level is ${portfolio.risk_label} with a score of ${portfolio.risk_score}/100. You're ${portfolio.goal_alignment}% aligned with your stated goals. Is there a specific aspect you'd like me to explain further?`,
    status: 'no_action_required',
    confidence: 'medium',
  };
}

// =============================================================================
// POST-LLM GUARDRAILS
// =============================================================================

function applyPostLLMGuardrails(response: string): string {
  let cleaned = response;
  
  const advicePhrases = [
    /you should (buy|sell|invest)/gi,
    /i recommend/gi,
    /my advice is/gi,
    /definitely (buy|sell)/gi,
  ];
  
  for (const pattern of advicePhrases) {
    cleaned = cleaned.replace(pattern, 'you might consider reviewing');
  }
  
  const predictionPhrases = [
    /will (definitely|certainly|surely) (rise|fall|go up|go down)/gi,
    /guaranteed to/gi,
    /certain to/gi,
  ];
  
  for (const pattern of predictionPhrases) {
    cleaned = cleaned.replace(pattern, 'may');
  }
  
  return cleaned;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CopilotQueryRequest = await request.json();
    
    // Validate required fields
    if (!body.question || !body.user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: question and user_id' },
        { status: 400 }
      );
    }
    
    // Step 1: Apply pre-LLM guardrails
    const guardrailResult = applyPreLLMGuardrails(body.question);
    const guardrailsTriggered: string[] = [];
    
    if (guardrailResult.triggered_rule) {
      guardrailsTriggered.push(guardrailResult.triggered_rule);
    }
    
    if (!guardrailResult.safe && guardrailResult.refusal_message) {
      // Return polite refusal for unsafe queries
      const response: CopilotQueryResponse = {
        response_type: 'explanation',
        status: 'no_action_required',
        summary: guardrailResult.refusal_message,
        confidence_level: 'high',
        follow_up_suggestions: [
          'Explain my portfolio risk',
          'How am I tracking against goals?',
          'What does my allocation look like?',
        ],
      };
      
      // Log the blocked query
      try {
        const supabase = await createClient();
        await logCopilotSession(supabase, {
          user_id: body.user_id,
          session_id: body.session_id || 'anonymous',
          question: body.question,
          intent: body.intent || 'blocked',
          response: guardrailResult.refusal_message,
          response_status: 'blocked',
          guardrails_triggered: guardrailsTriggered,
        });
      } catch (logError) {
        console.error('Failed to log blocked query:', logError);
      }
      
      return NextResponse.json(response);
    }
    
    // Use rewritten question if panic was detected
    const processedQuestion = guardrailResult.rewritten_question || body.question;
    
    // Step 2: Fetch context from Supabase (with fallback to mock)
    let portfolioContext: PortfolioContextMock;
    let userProfile: UserProfileMock;
    let marketContext: MarketContextMock;
    let usedRealData = false;
    
    try {
      const supabase = await createClient();
      const ctx = await getCopilotContext(supabase, body.user_id);
      
      if (ctx) {
        const transformed = transformSupabaseContext(ctx);
        portfolioContext = transformed.portfolio;
        userProfile = transformed.user;
        marketContext = transformed.market;
        usedRealData = true;
      } else {
        // Fallback to mock data
        portfolioContext = getMockPortfolioContext();
        userProfile = getMockUserProfile();
        marketContext = getMockMarketContext();
      }
    } catch (dbError) {
      console.error('Database error, falling back to mock:', dbError);
      portfolioContext = getMockPortfolioContext();
      userProfile = getMockUserProfile();
      marketContext = getMockMarketContext();
    }
    
    // Step 3: Generate AI response (or fallback to templates)
    const generatedResponse = await generateResponse(
      processedQuestion,
      body.intent || 'general_question',
      portfolioContext,
      userProfile,
      marketContext
    );
    
    // Step 4: Apply post-LLM guardrails
    const cleanedExplanation = applyPostLLMGuardrails(generatedResponse.explanation);
    
    // Step 5: Build structured response
    const response: CopilotQueryResponse = {
      response_type: 'explanation',
      status: generatedResponse.status,
      summary: generatedResponse.summary,
      explanation: cleanedExplanation,
      confidence_level: generatedResponse.confidence,
      follow_up_suggestions: [
        'See risk breakdown',
        'Understand sector exposure',
        'Check goal progress',
      ],
    };
    
    // Step 6: Log session to Supabase
    try {
      const supabase = await createClient();
      await logCopilotSession(supabase, {
        user_id: body.user_id,
        session_id: body.session_id || 'anonymous',
        question: body.question,
        intent: body.intent || 'general_question',
        response: response.summary + (response.explanation ? '\n\n' + response.explanation : ''),
        response_status: response.status,
        context_snapshot: usedRealData ? { source: 'supabase', ai_enabled: !!process.env.OPENAI_API_KEY } : { source: 'mock', ai_enabled: !!process.env.OPENAI_API_KEY },
        guardrails_triggered: guardrailsTriggered,
      });
    } catch (logError) {
      console.error('Failed to log session:', logError);
      // Don't fail the request if logging fails
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Copilot query error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}
