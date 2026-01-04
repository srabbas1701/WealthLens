"""
WealthLens Investment Intelligence
==================================

A production-grade, SEBI-compliant investment intelligence system.

This package provides:
- Orchestrator: Main entry point for processing user queries
- Guardrails: Pre and post-LLM safety checks
- Guardrail Functions: Independent, testable guardrail functions
- Agents: Deterministic context gathering
- System Prompt: Immutable LLM instructions

DESIGN PRINCIPLES:
1. Safety First: All critical decisions are deterministic
2. SEBI Compliant: Never provides buy/sell/timing advice
3. Explainable: Every decision is auditable
4. Calm & Trust-Focused: Builds confidence, not excitement

USAGE:
    from ai.copilot import CopilotOrchestrator
    
    orchestrator = CopilotOrchestrator(llm_client=your_openai_client)
    response = orchestrator.process_query(user_id="user_123", query="How is my portfolio?")
    
    print(response.message)

GUARDRAIL USAGE:
    from ai.copilot import GuardrailRunner, is_safe_query
    
    # Quick check
    if is_safe_query("Should I buy HDFC?"):
        # Process query
        pass
    else:
        # Refuse or redirect
        pass
    
    # Detailed check
    results, should_block, action = GuardrailRunner.run_pre_llm("Should I buy HDFC?")
"""

from .guardrail_functions import (
    # Advice detection
    detect_buy_advice_request,
    detect_sell_advice_request,
    detect_timing_advice_request,
    detect_any_advice_request,
    
    # Panic detection
    detect_panic_language,
    detect_urgency_language,
    detect_emotional_distress,
    
    # Overconfidence detection
    detect_guarantee_request,
    detect_overconfidence_in_output,
    
    # Prediction detection
    detect_prediction_request,
    detect_prediction_in_output,
    
    # Query rewriting
    rewrite_advice_query,
    rewrite_panic_query,
    
    # Output sanitization
    sanitize_advice_language,
    sanitize_prediction_language,
    sanitize_overconfidence_language,
    sanitize_output,
    
    # Composite runner
    GuardrailRunner,
    GuardrailResult,
    GuardrailType,
    
    # Convenience functions
    is_safe_query,
    get_query_action,
    safe_process_output,
)

__all__ = [
    # Guardrail Functions (independent functions)
    "detect_buy_advice_request",
    "detect_sell_advice_request",
    "detect_timing_advice_request",
    "detect_any_advice_request",
    "detect_panic_language",
    "detect_urgency_language",
    "detect_emotional_distress",
    "detect_guarantee_request",
    "detect_overconfidence_in_output",
    "detect_prediction_request",
    "detect_prediction_in_output",
    "rewrite_advice_query",
    "rewrite_panic_query",
    "sanitize_advice_language",
    "sanitize_prediction_language",
    "sanitize_overconfidence_language",
    "sanitize_output",
    "GuardrailRunner",
    "GuardrailResult",
    "GuardrailType",
    "is_safe_query",
    "get_query_action",
    "safe_process_output",
]

__version__ = "1.0.0"

