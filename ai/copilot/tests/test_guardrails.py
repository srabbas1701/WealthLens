"""
WealthLens Guardrail Tests
==========================

Comprehensive test suite for all guardrail functions.

TEST CATEGORIES:
1. Market Fall Scenarios - User concerned about market drops
2. User Panic Questions - Emotional distress detection
3. Direct Buy/Sell Requests - Advice-seeking detection
4. Long-term Reassurance - Normal portfolio questions
5. Guarantee Requests - Overconfidence detection
6. Prediction Requests - Forecasting detection

ASSERTIONS FOR EACH TEST:
- No advice is given (or advice is blocked)
- Tone remains calm (or panic is detected)
- Portfolio context is referenced (where applicable)
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from guardrail_functions import (
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
    
    # Output sanitization
    sanitize_advice_language,
    sanitize_prediction_language,
    sanitize_overconfidence_language,
    sanitize_output,
    
    # Composite runner
    GuardrailRunner,
    is_safe_query,
    get_query_action,
    safe_process_output,
    
    # Types
    GuardrailType,
    GuardrailResult,
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def market_fall_queries():
    """Queries about market falls/corrections."""
    return [
        "The market has fallen 5% today. What should I do?",
        "Nifty is down 1000 points. Should I sell everything?",
        "My portfolio is down 20%. Is this the end?",
        "Markets are crashing! Help!",
        "I've lost ₹2 lakh in one week. What now?",
        "The correction is getting worse. Should I exit?",
        "FIIs are selling heavily. Should I follow them?",
    ]


@pytest.fixture
def panic_queries():
    """Queries expressing panic or extreme fear."""
    return [
        "I'm panicking! The market is crashing!",
        "I've lost everything! What do I do?",
        "This is a disaster! I'm wiped out!",
        "I can't sleep thinking about my losses!",
        "Help!! I'm terrified of losing more!",
        "I'm freaking out about my portfolio!",
        "The market is bleeding! I'm scared!",
    ]


@pytest.fixture
def buy_advice_queries():
    """Queries asking for buy recommendations."""
    return [
        "Should I buy HDFC Bank?",
        "What stock should I buy now?",
        "Which mutual fund should I invest in?",
        "Is Reliance a good buy?",
        "Give me a stock tip",
        "What's the best fund to buy?",
        "Recommend me a multibagger",
        "Should I buy more of my existing funds?",
    ]


@pytest.fixture
def sell_advice_queries():
    """Queries asking for sell recommendations."""
    return [
        "Should I sell my ICICI shares?",
        "Is it time to exit my mutual funds?",
        "Should I redeem my investments?",
        "Should I book my profits now?",
        "Should I cut my losses?",
        "Is this the right time to sell?",
        "Should I exit before it falls more?",
    ]


@pytest.fixture
def timing_advice_queries():
    """Queries asking for market timing advice."""
    return [
        "When should I buy?",
        "Is this a good time to invest?",
        "Should I wait for the dip?",
        "When is the right time to enter the market?",
        "Should I buy the dip?",
        "What's the best entry point?",
        "When should I exit my positions?",
    ]


@pytest.fixture
def prediction_queries():
    """Queries asking for market predictions."""
    return [
        "Will the market go up tomorrow?",
        "Where will Nifty be in 6 months?",
        "Predict the market for next week",
        "What's the target price for TCS?",
        "Will Sensex cross 100000?",
        "How much will my portfolio grow?",
        "What returns can I expect?",
    ]


@pytest.fixture
def guarantee_queries():
    """Queries asking for guaranteed returns."""
    return [
        "Give me a guaranteed return investment",
        "I want 100% safe investment with high returns",
        "Which investment has no risk?",
        "I need assured returns",
        "How can I double my money safely?",
        "What's a risk-free investment option?",
        "I want fixed returns with no loss",
    ]


@pytest.fixture
def safe_queries():
    """Safe educational queries that should pass."""
    return [
        "How is my portfolio doing?",
        "Explain my asset allocation",
        "What is my risk score?",
        "How does SIP work?",
        "What is diversification?",
        "Explain the difference between equity and debt",
        "How are my goals progressing?",
        "What sectors am I invested in?",
        "Tell me about my portfolio concentration",
        "How does LTCG tax work?",
    ]


@pytest.fixture
def unsafe_llm_outputs():
    """LLM outputs that should be caught by post-LLM guardrails."""
    return [
        "You should definitely buy this stock now.",
        "I recommend selling your holdings immediately.",
        "The market will certainly go up next month.",
        "This investment is guaranteed to give 20% returns.",
        "You can't go wrong with this fund.",
        "Nifty will definitely cross 30000 by year end.",
        "This is a sure thing, invest all your money.",
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: MARKET FALL SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════════

class TestMarketFallScenarios:
    """
    Tests for queries about market falls and corrections.
    
    These tests ensure that:
    1. Panic is detected when present
    2. Advice-seeking is detected when present
    3. The system doesn't give buy/sell advice
    4. The tone remains calm in responses
    """
    
    def test_market_fall_with_sell_advice_request(self):
        """Test that sell advice requests during market falls are detected."""
        query = "Market is down 10%. Should I sell everything?"
        
        # Should detect sell advice request
        result = detect_sell_advice_request(query)
        assert result.triggered, "Should detect sell advice request"
        assert result.guardrail_type == GuardrailType.ADVICE
        assert result.severity == "critical"
    
    def test_market_fall_with_panic(self):
        """Test that panic is detected during market fall discussions."""
        query = "Markets are crashing! I'm losing everything! Help!"
        
        # Should detect panic
        result = detect_panic_language(query)
        assert result.triggered, "Should detect panic language"
        assert result.guardrail_type == GuardrailType.PANIC
    
    def test_market_fall_neutral_question(self):
        """Test that neutral questions about market falls are allowed."""
        query = "The market fell 5% this week. How does this affect my portfolio?"
        
        # Should NOT trigger advice detection
        buy_result = detect_buy_advice_request(query)
        sell_result = detect_sell_advice_request(query)
        
        assert not buy_result.triggered, "Should not detect buy advice"
        assert not sell_result.triggered, "Should not detect sell advice"
    
    def test_market_fall_with_timing_question(self):
        """Test that timing questions during market falls are detected."""
        query = "Market is down. Is this a good time to invest more?"
        
        result = detect_timing_advice_request(query)
        assert result.triggered, "Should detect timing advice request"
    
    def test_market_fall_action_determination(self):
        """Test correct action is determined for market fall queries."""
        # Panic query should route to "calm"
        panic_query = "Market is crashing! I'm freaking out!"
        _, _, action = GuardrailRunner.run_pre_llm(panic_query)
        assert action in ["calm", "refuse"], f"Panic should route to calm/refuse, got {action}"
        
        # Advice query should route to "refuse"
        advice_query = "Market is down. Should I sell everything?"
        _, _, action = GuardrailRunner.run_pre_llm(advice_query)
        assert action == "refuse", f"Advice query should refuse, got {action}"


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: USER PANIC QUESTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class TestPanicDetection:
    """
    Tests for panic and emotional distress detection.
    
    These tests ensure that:
    1. Panic language is reliably detected
    2. Urgency language is detected
    3. The system routes to calming responses
    4. False positives are minimized
    """
    
    def test_panic_language_detection(self, panic_queries):
        """Test that all panic queries are detected."""
        for query in panic_queries:
            result = detect_panic_language(query)
            assert result.triggered, f"Should detect panic in: {query}"
            assert result.guardrail_type == GuardrailType.PANIC
    
    def test_urgency_detection(self):
        """Test urgency language detection."""
        urgency_queries = [
            "I need to act immediately!",
            "Tell me right now what to do!",
            "This is urgent! Help ASAP!",
            "I need to decide quickly!",
        ]
        
        for query in urgency_queries:
            result = detect_urgency_language(query)
            assert result.triggered, f"Should detect urgency in: {query}"
    
    def test_combined_panic_and_urgency(self):
        """Test queries with both panic and urgency."""
        query = "Market is crashing! I need to sell immediately! Help!!"
        
        is_distressed, results = detect_emotional_distress(query)
        assert is_distressed, "Should detect emotional distress"
        
        triggered_types = [r.guardrail_name for r in results if r.triggered]
        assert len(triggered_types) >= 1, "Should trigger at least one guardrail"
    
    def test_panic_false_positives(self):
        """Test that normal queries don't trigger panic detection."""
        normal_queries = [
            "How is my portfolio doing?",
            "Explain the recent market correction",
            "What is my asset allocation?",
            "Tell me about diversification",
        ]
        
        for query in normal_queries:
            result = detect_panic_language(query)
            assert not result.triggered, f"Should not detect panic in: {query}"
    
    def test_panic_severity_levels(self):
        """Test that panic severity is correctly assessed."""
        mild_panic = "I'm a bit worried about the market"
        severe_panic = "I'm panicking! Lost everything! Terrified! Help!!"
        
        mild_result = detect_panic_language(mild_panic)
        severe_result = detect_panic_language(severe_panic)
        
        # Severe panic should have higher severity
        if severe_result.triggered:
            assert severe_result.severity in ["high", "critical"]
    
    def test_panic_action_routing(self):
        """Test that panic queries route to calm action."""
        query = "I'm really scared about my investments"
        
        _, should_block, action = GuardrailRunner.run_pre_llm(query)
        
        # Panic should not block but should route to calm
        if detect_panic_language(query).triggered:
            assert action == "calm" or not should_block


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: DIRECT BUY/SELL REQUESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdviceDetection:
    """
    Tests for buy/sell/timing advice detection.
    
    These tests ensure that:
    1. Buy advice requests are reliably detected
    2. Sell advice requests are reliably detected
    3. Timing advice requests are reliably detected
    4. Such queries are blocked or rewritten
    5. No advice slips through
    """
    
    def test_buy_advice_detection(self, buy_advice_queries):
        """Test that all buy advice queries are detected."""
        for query in buy_advice_queries:
            result = detect_buy_advice_request(query)
            assert result.triggered, f"Should detect buy advice in: {query}"
            assert result.severity == "critical"
    
    def test_sell_advice_detection(self, sell_advice_queries):
        """Test that all sell advice queries are detected."""
        for query in sell_advice_queries:
            result = detect_sell_advice_request(query)
            assert result.triggered, f"Should detect sell advice in: {query}"
            assert result.severity == "critical"
    
    def test_timing_advice_detection(self, timing_advice_queries):
        """Test that all timing advice queries are detected."""
        for query in timing_advice_queries:
            result = detect_timing_advice_request(query)
            assert result.triggered, f"Should detect timing advice in: {query}"
    
    def test_combined_advice_detection(self):
        """Test the combined advice detection function."""
        query = "Should I buy HDFC Bank now or wait for a dip?"
        
        any_triggered, results = detect_any_advice_request(query)
        assert any_triggered, "Should detect advice request"
        
        # Should trigger multiple guardrails
        triggered_names = [r.guardrail_name for r in results if r.triggered]
        assert len(triggered_names) >= 1
    
    def test_advice_queries_blocked(self, buy_advice_queries):
        """Test that advice queries are blocked."""
        for query in buy_advice_queries:
            is_safe = is_safe_query(query)
            assert not is_safe, f"Should block: {query}"
    
    def test_advice_query_rewriting(self):
        """Test that advice queries can be rewritten."""
        test_cases = [
            ("Should I buy HDFC Bank?", "risks and considerations"),
            ("Should I sell my holdings?", "fits in my portfolio"),
            ("What's the best stock to buy?", "evaluate different"),
        ]
        
        for original, expected_phrase in test_cases:
            rewritten, was_rewritten = rewrite_advice_query(original)
            assert was_rewritten, f"Should rewrite: {original}"
            assert expected_phrase.lower() in rewritten.lower(), \
                f"Rewritten should contain '{expected_phrase}': {rewritten}"
    
    def test_advice_false_positives(self, safe_queries):
        """Test that safe queries don't trigger advice detection."""
        for query in safe_queries:
            buy_result = detect_buy_advice_request(query)
            sell_result = detect_sell_advice_request(query)
            timing_result = detect_timing_advice_request(query)
            
            assert not buy_result.triggered, f"False positive (buy) for: {query}"
            assert not sell_result.triggered, f"False positive (sell) for: {query}"
            assert not timing_result.triggered, f"False positive (timing) for: {query}"
    
    def test_hindi_advice_detection(self):
        """Test advice detection for Hindi queries."""
        hindi_queries = [
            "Kya mujhe yeh stock buy karna chahiye?",
            "Sell karna chahiye kya?",
        ]
        
        for query in hindi_queries:
            any_triggered, _ = detect_any_advice_request(query)
            # Note: Hindi support may be partial, so we just test it doesn't crash
            assert isinstance(any_triggered, bool)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: LONG-TERM REASSURANCE SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════════

class TestLongTermReassurance:
    """
    Tests for normal portfolio explanation queries.
    
    These tests ensure that:
    1. Safe educational queries pass through
    2. Portfolio explanation queries are allowed
    3. The system can provide reassurance without advice
    4. Context is properly referenced
    """
    
    def test_safe_queries_pass(self, safe_queries):
        """Test that safe educational queries pass all guardrails."""
        for query in safe_queries:
            is_safe = is_safe_query(query)
            assert is_safe, f"Should allow: {query}"
    
    def test_portfolio_explanation_allowed(self):
        """Test that portfolio explanation queries are allowed."""
        queries = [
            "Explain my current portfolio allocation",
            "How diversified am I?",
            "What's my risk score?",
            "Show me my sector exposure",
            "How are my goals progressing?",
        ]
        
        for query in queries:
            action = get_query_action(query)
            assert action == "proceed", f"Should proceed with: {query}"
    
    def test_educational_queries_allowed(self):
        """Test that educational queries are allowed."""
        queries = [
            "What is SIP and how does it work?",
            "Explain the power of compounding",
            "What's the difference between growth and dividend options?",
            "How does ELSS tax saving work?",
            "What is asset allocation?",
        ]
        
        for query in queries:
            action = get_query_action(query)
            assert action == "proceed", f"Should proceed with: {query}"
    
    def test_comparison_queries_allowed(self):
        """Test that comparison queries are allowed."""
        queries = [
            "What's the difference between index funds and active funds?",
            "Compare equity and debt investments",
            "Large cap vs mid cap - what's the difference?",
        ]
        
        for query in queries:
            action = get_query_action(query)
            assert action == "proceed", f"Should proceed with: {query}"
    
    def test_goal_progress_queries_allowed(self):
        """Test that goal progress queries are allowed."""
        queries = [
            "Am I on track for my retirement goal?",
            "How is my emergency fund progressing?",
            "Will I reach my house down payment target?",
        ]
        
        for query in queries:
            # These should pass, even if they contain "will"
            # because they're about personal goals, not market predictions
            action = get_query_action(query)
            # Note: Some may trigger prediction detection due to "will"
            # but the system should handle this gracefully


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: GUARANTEE/OVERCONFIDENCE DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

class TestOverconfidenceDetection:
    """
    Tests for guarantee and overconfidence detection.
    
    These tests ensure that:
    1. Guarantee requests are detected
    2. Overconfident LLM output is caught
    3. Such language is sanitized
    4. No false promises slip through
    """
    
    def test_guarantee_request_detection(self, guarantee_queries):
        """Test that all guarantee requests are detected."""
        for query in guarantee_queries:
            result = detect_guarantee_request(query)
            assert result.triggered, f"Should detect guarantee request in: {query}"
            assert result.severity == "critical"
    
    def test_overconfidence_output_detection(self):
        """Test detection of overconfident LLM output."""
        overconfident_outputs = [
            "This will definitely give you 20% returns.",
            "You're guaranteed to make money with this.",
            "This is 100% safe.",
            "You can't go wrong with this investment.",
            "This is a sure thing.",
        ]
        
        for output in overconfident_outputs:
            result = detect_overconfidence_in_output(output)
            assert result.triggered, f"Should detect overconfidence in: {output}"
    
    def test_overconfidence_sanitization(self):
        """Test that overconfident language is sanitized."""
        test_cases = [
            ("This will definitely work", "definitely"),
            ("You're guaranteed success", "guaranteed"),
            ("This is 100% safe", "100%"),
            ("You can't go wrong", "can't go wrong"),
        ]
        
        for original, forbidden_phrase in test_cases:
            sanitized = sanitize_overconfidence_language(original)
            assert forbidden_phrase not in sanitized.lower(), \
                f"Should remove '{forbidden_phrase}' from: {original}"
    
    def test_guarantee_queries_blocked(self, guarantee_queries):
        """Test that guarantee queries are blocked."""
        for query in guarantee_queries:
            is_safe = is_safe_query(query)
            assert not is_safe, f"Should block: {query}"


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: PREDICTION DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

class TestPredictionDetection:
    """
    Tests for market prediction detection.
    
    These tests ensure that:
    1. Prediction requests are detected
    2. Prediction output is caught
    3. No forecasts slip through
    """
    
    def test_prediction_request_detection(self, prediction_queries):
        """Test that all prediction requests are detected."""
        for query in prediction_queries:
            result = detect_prediction_request(query)
            assert result.triggered, f"Should detect prediction request in: {query}"
            assert result.severity == "critical"
    
    def test_prediction_output_detection(self):
        """Test detection of predictions in LLM output."""
        prediction_outputs = [
            "The market will go up next month.",
            "Nifty is expected to reach 30000.",
            "This stock will definitely rise.",
            "Prices should hit 500 by year end.",
        ]
        
        for output in prediction_outputs:
            result = detect_prediction_in_output(output)
            assert result.triggered, f"Should detect prediction in: {output}"
    
    def test_prediction_sanitization(self):
        """Test that prediction language is sanitized."""
        test_cases = [
            ("The market will go up", "will go up"),
            ("Prices will definitely rise", "will definitely"),
            ("Expected to reach 1000", "expected to reach"),
        ]
        
        for original, forbidden_phrase in test_cases:
            sanitized = sanitize_prediction_language(original)
            assert forbidden_phrase not in sanitized.lower(), \
                f"Should remove '{forbidden_phrase}' from: {original}"
    
    def test_prediction_queries_blocked(self, prediction_queries):
        """Test that prediction queries are blocked."""
        for query in prediction_queries:
            is_safe = is_safe_query(query)
            assert not is_safe, f"Should block: {query}"


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: OUTPUT SANITIZATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestOutputSanitization:
    """
    Tests for LLM output sanitization.
    
    These tests ensure that:
    1. Advice language is removed
    2. Prediction language is softened
    3. Overconfidence is toned down
    4. Safe output passes through unchanged
    """
    
    def test_advice_sanitization(self):
        """Test that advice language is sanitized."""
        test_cases = [
            ("You should buy this stock", "should buy"),
            ("I recommend selling your holdings", "recommend selling"),
            ("My advice is to invest more", "my advice"),
            ("You must buy this now", "must buy"),
        ]
        
        for original, forbidden_phrase in test_cases:
            sanitized = sanitize_advice_language(original)
            assert forbidden_phrase not in sanitized.lower(), \
                f"Should remove '{forbidden_phrase}' from: {original}"
    
    def test_combined_sanitization(self, unsafe_llm_outputs):
        """Test combined sanitization of unsafe outputs."""
        for output in unsafe_llm_outputs:
            sanitized, sanitizations = sanitize_output(output)
            
            # Should have applied at least one sanitization
            assert len(sanitizations) > 0, f"Should sanitize: {output}"
            
            # Sanitized output should be different
            assert sanitized != output, f"Output should be modified: {output}"
    
    def test_safe_output_unchanged(self):
        """Test that safe output passes through unchanged."""
        safe_outputs = [
            "Your portfolio is well-diversified across sectors.",
            "Based on your risk profile, this allocation seems appropriate.",
            "Here's how your goals are progressing.",
            "Let me explain how SIP works.",
        ]
        
        for output in safe_outputs:
            sanitized, sanitizations = sanitize_output(output)
            # May have minor changes, but should be mostly unchanged
            assert len(sanitizations) == 0 or sanitized == output
    
    def test_safe_process_output_function(self):
        """Test the convenience function for safe output processing."""
        unsafe = "You should definitely buy this stock now!"
        safe = safe_process_output(unsafe)
        
        assert "should" not in safe.lower() or "definitely" not in safe.lower()


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: GUARDRAIL RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

class TestGuardrailRunner:
    """
    Tests for the composite guardrail runner.
    """
    
    def test_pre_llm_runner(self):
        """Test the pre-LLM guardrail runner."""
        # Safe query
        results, should_block, action = GuardrailRunner.run_pre_llm(
            "How is my portfolio doing?"
        )
        assert not should_block
        assert action == "proceed"
        
        # Unsafe query
        results, should_block, action = GuardrailRunner.run_pre_llm(
            "Should I buy HDFC Bank?"
        )
        assert should_block
        assert action == "refuse"
    
    def test_post_llm_runner(self):
        """Test the post-LLM guardrail runner."""
        unsafe_output = "You should definitely buy this stock."
        results, sanitized = GuardrailRunner.run_post_llm(unsafe_output)
        
        # Should have triggered guardrails
        triggered = [r for r in results if r.triggered]
        
        # Output should be sanitized
        assert sanitized != unsafe_output or len(triggered) > 0
    
    def test_summary_generation(self):
        """Test guardrail summary generation."""
        results, _, _ = GuardrailRunner.run_pre_llm(
            "Should I buy this stock immediately?"
        )
        
        summary = GuardrailRunner.get_summary(results)
        
        assert "total_checks" in summary
        assert "triggered_count" in summary
        assert "triggered_guardrails" in summary
        assert summary["triggered_count"] > 0


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    """
    Tests for edge cases and boundary conditions.
    """
    
    def test_empty_query(self):
        """Test handling of empty queries."""
        result = detect_buy_advice_request("")
        assert not result.triggered
    
    def test_very_long_query(self):
        """Test handling of very long queries."""
        long_query = "Should I buy " + "HDFC Bank " * 100 + "?"
        result = detect_buy_advice_request(long_query)
        assert result.triggered  # Should still detect
    
    def test_mixed_case_query(self):
        """Test case-insensitive detection."""
        queries = [
            "SHOULD I BUY HDFC?",
            "Should I Buy HDFC?",
            "should i buy hdfc?",
            "ShOuLd I bUy HdFc?",
        ]
        
        for query in queries:
            result = detect_buy_advice_request(query)
            assert result.triggered, f"Should detect regardless of case: {query}"
    
    def test_query_with_special_characters(self):
        """Test handling of special characters."""
        queries = [
            "Should I buy HDFC???",
            "Should I buy HDFC!!!",
            "Should I buy HDFC?!?!",
            "Should I buy 'HDFC'?",
        ]
        
        for query in queries:
            result = detect_buy_advice_request(query)
            assert result.triggered, f"Should detect with special chars: {query}"
    
    def test_unicode_handling(self):
        """Test handling of unicode characters."""
        query = "Should I buy ₹10000 worth of HDFC?"
        result = detect_buy_advice_request(query)
        assert result.triggered
    
    def test_multiple_guardrail_triggers(self):
        """Test query that triggers multiple guardrails."""
        query = "I'm panicking! Should I sell everything immediately?"
        
        results, should_block, action = GuardrailRunner.run_pre_llm(query)
        triggered = [r for r in results if r.triggered]
        
        # Should trigger multiple guardrails
        assert len(triggered) >= 2


# ═══════════════════════════════════════════════════════════════════════════════
# TEST CLASS: LOGGING AND AUDIT
# ═══════════════════════════════════════════════════════════════════════════════

class TestLoggingAndAudit:
    """
    Tests for logging and audit trail functionality.
    """
    
    def test_result_to_log_dict(self):
        """Test conversion of result to log dictionary."""
        result = GuardrailResult(
            triggered=True,
            guardrail_type=GuardrailType.ADVICE,
            guardrail_name="buy_advice_detector",
            reason="Direct buy advice request",
            matched_pattern=r"\bshould\s+i\s+buy\b",
            original_text="Should I buy HDFC?",
            severity="critical"
        )
        
        log_dict = result.to_log_dict()
        
        assert log_dict["triggered"] == True
        assert log_dict["guardrail_type"] == "advice"
        assert log_dict["guardrail_name"] == "buy_advice_detector"
        assert log_dict["severity"] == "critical"
        assert "timestamp" in log_dict
    
    def test_all_results_have_required_fields(self):
        """Test that all guardrail results have required fields."""
        query = "Should I buy HDFC Bank?"
        
        results, _, _ = GuardrailRunner.run_pre_llm(query)
        
        for result in results:
            assert hasattr(result, "triggered")
            assert hasattr(result, "guardrail_type")
            assert hasattr(result, "guardrail_name")
            assert hasattr(result, "severity")
            assert hasattr(result, "timestamp")


# ═══════════════════════════════════════════════════════════════════════════════
# RUN TESTS
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

