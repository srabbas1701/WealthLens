import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { 
  OnboardingUnderstandingRequest, 
  OnboardingUnderstandingResponse,
  ConfidenceLevel
} from '@/types/copilot';

/**
 * POST /api/onboarding/understanding
 * 
 * Powers the "Here's what we understand" screen in onboarding.
 * 
 * Frontend behavior:
 * - Shows summary
 * - User confirms or edits
 * - Data saved to Supabase
 * 
 * This endpoint analyzes user inputs and generates a personalized
 * understanding of their investment profile.
 */

// =============================================================================
// RISK ANALYSIS
// =============================================================================

interface RiskAnalysis {
  label: string;
  score: number;
  description: string;
}

function analyzeRisk(
  riskAnswers: string[],
  portfolioSnapshot: { equity_pct: number; debt_pct: number; cash_pct: number }
): RiskAnalysis {
  // Score based on risk answers
  let riskScore = 50; // Start at moderate
  
  for (const answer of riskAnswers) {
    switch (answer) {
      case 'prefer_safety':
        riskScore -= 15;
        break;
      case 'worried_but_stay_invested':
        riskScore -= 5;
        break;
      case 'comfortable_with_volatility':
        riskScore += 10;
        break;
      case 'focus_on_growth':
        riskScore += 15;
        break;
    }
  }
  
  // Adjust based on current portfolio composition
  if (portfolioSnapshot.equity_pct > 70) {
    riskScore += 10;
  } else if (portfolioSnapshot.equity_pct < 30) {
    riskScore -= 10;
  }
  
  // Clamp score
  riskScore = Math.max(20, Math.min(80, riskScore));
  
  // Determine label
  let label: string;
  let description: string;
  
  if (riskScore < 35) {
    label = 'Conservative';
    description = 'You prefer stability over high returns';
  } else if (riskScore < 55) {
    label = 'Moderate';
    description = 'You balance growth with stability';
  } else if (riskScore < 70) {
    label = 'Growth';
    description = 'You prioritize long-term growth';
  } else {
    label = 'Aggressive';
    description = 'You\'re comfortable with significant volatility';
  }
  
  return { label, score: riskScore, description };
}

// =============================================================================
// GOAL ALIGNMENT ANALYSIS
// =============================================================================

function analyzeGoalAlignment(
  goals: string,
  horizonYears: number,
  portfolioSnapshot: { equity_pct: number; debt_pct: number; cash_pct: number },
  riskLabel: string
): { alignment: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let alignment = 'On Track';
  
  // Long-term goals need equity exposure
  if (horizonYears > 10 && portfolioSnapshot.equity_pct < 50) {
    alignment = 'Needs Review';
    suggestions.push('Consider higher equity allocation for long-term goals');
  }
  
  // Short-term goals need stability
  if (horizonYears < 5 && portfolioSnapshot.equity_pct > 60) {
    alignment = 'Needs Review';
    suggestions.push('Short-term goals may benefit from more stable assets');
  }
  
  // Cash drag warning
  if (portfolioSnapshot.cash_pct > 20) {
    suggestions.push('High cash allocation may impact long-term growth');
  }
  
  // Risk-goal alignment
  if (riskLabel === 'Conservative' && horizonYears > 15) {
    suggestions.push('Your conservative approach is fine, but you have time to take more risk if comfortable');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Your portfolio aligns well with your stated goals');
  }
  
  return { alignment, suggestions };
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

function generateSummary(
  riskAnalysis: RiskAnalysis,
  goalAlignment: { alignment: string; suggestions: string[] },
  portfolioSnapshot: { equity_pct: number; debt_pct: number; cash_pct: number },
  horizonYears: number
): string[] {
  const summary: string[] = [];
  
  // Risk profile statement
  summary.push(`You are a ${riskAnalysis.label.toLowerCase()} risk investor`);
  
  // Portfolio composition
  if (portfolioSnapshot.equity_pct > portfolioSnapshot.debt_pct) {
    summary.push('Your portfolio is equity-heavy, focused on growth');
  } else if (portfolioSnapshot.debt_pct > portfolioSnapshot.equity_pct) {
    summary.push('Your portfolio is debt-heavy, focused on stability');
  } else {
    summary.push('Your portfolio has a balanced mix of equity and debt');
  }
  
  // Time horizon context
  if (horizonYears > 10) {
    summary.push(`With a ${horizonYears}+ year horizon, you have time for long-term growth`);
  } else if (horizonYears > 5) {
    summary.push(`Your ${horizonYears}-year horizon allows for moderate risk-taking`);
  } else {
    summary.push(`Your shorter horizon suggests focusing on capital preservation`);
  }
  
  // Goal alignment
  if (goalAlignment.alignment === 'On Track') {
    summary.push('Your risk level aligns with your goals');
  } else {
    summary.push('Some adjustments may help align your portfolio with your goals');
  }
  
  return summary;
}

// =============================================================================
// CONFIDENCE CALCULATION
// =============================================================================

function calculateConfidence(
  riskAnswers: string[],
  portfolioSnapshot: { equity_pct: number; debt_pct: number; cash_pct: number }
): ConfidenceLevel {
  // More data = higher confidence
  let confidenceScore = 0;
  
  if (riskAnswers.length > 0) confidenceScore += 30;
  if (riskAnswers.length > 1) confidenceScore += 20;
  
  const totalAllocation = portfolioSnapshot.equity_pct + portfolioSnapshot.debt_pct + portfolioSnapshot.cash_pct;
  if (totalAllocation >= 95 && totalAllocation <= 105) confidenceScore += 30;
  
  if (portfolioSnapshot.equity_pct > 0 || portfolioSnapshot.debt_pct > 0) confidenceScore += 20;
  
  if (confidenceScore >= 80) return 'high';
  if (confidenceScore >= 50) return 'medium';
  return 'low';
}

// =============================================================================
// SAVE TO SUPABASE
// =============================================================================

async function saveOnboardingSnapshot(
  userId: string,
  goals: string,
  horizonYears: number,
  riskAnswers: string[],
  portfolioSnapshot: { equity_pct: number; debt_pct: number; cash_pct: number },
  riskLabel: string,
  riskScore: number,
  summary: string[],
  confidence: ConfidenceLevel
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Use type assertion for upsert with custom fields
    const { error } = await supabase
      .from('onboarding_snapshots')
      .upsert({
        user_id: userId,
        goals: [goals],
        primary_goal: goals,
        horizon_years: horizonYears,
        risk_answers: riskAnswers as unknown as null, // JSON type
        risk_label: riskLabel,
        risk_score: riskScore,
        portfolio_snapshot: portfolioSnapshot as unknown as null, // JSON type
        ai_summary: summary,
        confidence: confidence as 'high' | 'medium' | 'low',
        is_complete: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Failed to save onboarding snapshot:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving onboarding snapshot:', error);
    return false;
  }
}

// =============================================================================
// UPDATE USER PROFILE
// =============================================================================

async function updateUserProfile(
  userId: string,
  riskLabel: string,
  riskScore: number,
  primaryGoal: string,
  horizonYears: number
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Use type assertion for upsert
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        risk_label: riskLabel as 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive',
        risk_score: riskScore,
        primary_goal: primaryGoal,
        horizon_years: horizonYears,
        updated_at: new Date().toISOString(),
      } as any, {
        onConflict: 'id',
      });

    if (error) {
      console.error('Failed to update user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingUnderstandingRequest = await request.json();
    
    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }
    
    // Default values for missing fields
    const portfolioSnapshot = body.portfolio_snapshot || {
      equity_pct: 60,
      debt_pct: 30,
      cash_pct: 10,
    };
    
    const horizonYears = body.horizon_years || 10;
    const riskAnswers = body.risk_answers || ['worried_but_stay_invested'];
    const goals = body.goals || 'long_term_wealth';
    
    // Analyze risk profile
    const riskAnalysis = analyzeRisk(riskAnswers, portfolioSnapshot);
    
    // Analyze goal alignment
    const goalAlignment = analyzeGoalAlignment(
      goals,
      horizonYears,
      portfolioSnapshot,
      riskAnalysis.label
    );
    
    // Generate summary points
    const summaryPoints = generateSummary(
      riskAnalysis,
      goalAlignment,
      portfolioSnapshot,
      horizonYears
    );
    
    // Calculate confidence
    const confidence = calculateConfidence(riskAnswers, portfolioSnapshot);
    
    // Save to Supabase (non-blocking - don't fail if save fails)
    try {
      await Promise.all([
        saveOnboardingSnapshot(
          body.user_id,
          goals,
          horizonYears,
          riskAnswers,
          portfolioSnapshot,
          riskAnalysis.label,
          riskAnalysis.score,
          summaryPoints,
          confidence
        ),
        updateUserProfile(
          body.user_id,
          riskAnalysis.label,
          riskAnalysis.score,
          goals,
          horizonYears
        ),
      ]);
      console.log('Saved onboarding data for user:', body.user_id);
    } catch (saveError) {
      console.error('Failed to save onboarding data:', saveError);
      // Continue - don't fail the request
    }
    
    // Build response
    const response: OnboardingUnderstandingResponse = {
      risk_label: riskAnalysis.label,
      goal_alignment: goalAlignment.alignment,
      summary: summaryPoints,
      confidence,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Onboarding understanding error:', error);
    return NextResponse.json(
      { error: 'Failed to generate understanding' },
      { status: 500 }
    );
  }
}
