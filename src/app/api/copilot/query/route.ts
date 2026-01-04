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
 * 6. Call LLM (mock for now)
 * 7. Post-process response (post-LLM guardrails)
 * 8. Log session to Supabase
 * 
 * Frontend does NONE of this - just passes intent and renders response.
 */

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
// RESPONSE GENERATION
// =============================================================================

function generateResponse(
  question: string,
  intent: string,
  portfolio: PortfolioContextMock,
  user: UserProfileMock,
  market: MarketContextMock
): { summary: string; explanation: string; status: Status; confidence: ConfidenceLevel } {
  
  // Intent-based response templates
  // In production, this would be LLM-generated with system prompt injection
  
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
    
    // Step 3: Generate response
    const generatedResponse = generateResponse(
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
        context_snapshot: usedRealData ? { source: 'supabase' } : { source: 'mock' },
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
