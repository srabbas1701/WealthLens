"""
WealthLens Guardrail Functions
==============================

This module contains independent, reusable guardrail functions.
Each guardrail is a self-contained function that can be:
- Called independently
- Composed with other guardrails
- Tested in isolation
- Logged and audited

DESIGN PRINCIPLES:
1. Each function has a single responsibility
2. All functions are DETERMINISTIC (no AI)
3. Every trigger is logged with a reason
4. Functions can optionally rewrite queries
5. Safety is NEVER weakened

GUARDRAIL CATEGORIES:
1. Advice Detection - buy/sell/timing requests
2. Panic Detection - emotional distress indicators
3. Overconfidence Detection - guarantee/certainty language
4. Prediction Detection - market forecasting requests
5. Injection Detection - prompt manipulation attempts
"""

import re
import logging
from dataclasses import dataclass
from typing import Optional, List, Tuple, Callable
from enum import Enum
from datetime import datetime
import json

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING SETUP
# ═══════════════════════════════════════════════════════════════════════════════

# Configure guardrail-specific logger
guardrail_logger = logging.getLogger("wealthlensai.guardrails")
guardrail_logger.setLevel(logging.INFO)

# Create handler if not exists
if not guardrail_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    guardrail_logger.addHandler(handler)


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class GuardrailType(Enum):
    """Types of guardrails."""
    ADVICE = "advice"
    PANIC = "panic"
    OVERCONFIDENCE = "overconfidence"
    PREDICTION = "prediction"
    INJECTION = "injection"
    COMPLIANCE = "compliance"


@dataclass
class GuardrailResult:
    """
    Result of a guardrail check.
    
    Attributes:
        triggered: Whether the guardrail was triggered
        guardrail_type: Type of guardrail
        guardrail_name: Specific name of the guardrail
        reason: Human-readable explanation of why it triggered
        matched_pattern: The specific pattern that matched (if any)
        original_text: The original input text
        rewritten_text: Optionally rewritten text (if applicable)
        severity: How severe the violation is (critical, high, medium, low)
        timestamp: When the check was performed
    """
    triggered: bool
    guardrail_type: GuardrailType
    guardrail_name: str
    reason: Optional[str] = None
    matched_pattern: Optional[str] = None
    original_text: Optional[str] = None
    rewritten_text: Optional[str] = None
    severity: str = "medium"
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_log_dict(self) -> dict:
        """Convert to dictionary for logging."""
        return {
            "triggered": self.triggered,
            "guardrail_type": self.guardrail_type.value,
            "guardrail_name": self.guardrail_name,
            "reason": self.reason,
            "matched_pattern": self.matched_pattern,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "was_rewritten": self.rewritten_text is not None,
        }


def log_guardrail_trigger(result: GuardrailResult) -> None:
    """
    Log a guardrail trigger for audit purposes.
    
    All guardrail triggers should be logged for:
    - Compliance auditing
    - System monitoring
    - Pattern analysis
    - Debugging
    """
    if result.triggered:
        guardrail_logger.warning(
            f"GUARDRAIL TRIGGERED: {result.guardrail_name} | "
            f"Type: {result.guardrail_type.value} | "
            f"Severity: {result.severity} | "
            f"Reason: {result.reason} | "
            f"Pattern: {result.matched_pattern}"
        )
    else:
        guardrail_logger.debug(
            f"Guardrail passed: {result.guardrail_name}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# ADVICE DETECTION GUARDRAILS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_buy_advice_request(text: str) -> GuardrailResult:
    """
    Detect if user is asking for buy recommendations.
    
    WHY THIS EXISTS:
    - SEBI prohibits unregistered entities from giving buy advice
    - We must refuse these requests, not attempt to answer them
    - Users should be redirected to SEBI-registered advisors
    
    PATTERNS DETECTED:
    - "Should I buy X?"
    - "What stock/fund should I buy?"
    - "Is X a good buy?"
    - "Recommend something to buy"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if buy advice detected
    """
    patterns = [
        (r"\bshould\s+i\s+buy\b", "Direct buy advice request"),
        (r"\b(what|which)\s+(stock|share|fund|investment)\s+(should|to)\s+buy\b", "Stock/fund recommendation request"),
        (r"\brecommend\s+(a\s+)?(stock|share|fund|investment)\s+to\s+buy\b", "Buy recommendation request"),
        (r"\b(is|are)\s+.+\s+(a\s+)?good\s+buy\b", "Buy evaluation request"),
        (r"\bbest\s+(stock|share|fund)\s+to\s+buy\b", "Best buy request"),
        (r"\bgive\s+me\s+(a\s+)?buy\s+(tip|recommendation)\b", "Buy tip request"),
        (r"\bwhat\s+to\s+buy\b", "General buy advice"),
        (r"\bbuy\s+karna\s+chahiye\b", "Hindi buy advice request"),  # Hindi support
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.ADVICE,
                guardrail_name="buy_advice_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.ADVICE,
        guardrail_name="buy_advice_detector",
        original_text=text
    )


def detect_sell_advice_request(text: str) -> GuardrailResult:
    """
    Detect if user is asking for sell recommendations.
    
    WHY THIS EXISTS:
    - Sell advice can cause users to make emotional decisions
    - We cannot advise on timing of exits
    - Users should understand their own situation
    
    PATTERNS DETECTED:
    - "Should I sell X?"
    - "Is it time to sell?"
    - "Should I exit/redeem?"
    - "Book profits now?"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if sell advice detected
    """
    patterns = [
        (r"\bshould\s+i\s+sell\b", "Direct sell advice request"),
        (r"\bshould\s+i\s+(exit|redeem|withdraw)\b", "Exit advice request"),
        (r"\b(is\s+it|time)\s+to\s+sell\b", "Timing sell request"),
        (r"\bbook\s+(my\s+)?profits?\b", "Profit booking advice"),
        (r"\bcut\s+(my\s+)?loss(es)?\b", "Loss cutting advice"),
        (r"\bsell\s+karna\s+chahiye\b", "Hindi sell advice request"),
        (r"\bexit\s+karna\s+chahiye\b", "Hindi exit advice request"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.ADVICE,
                guardrail_name="sell_advice_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.ADVICE,
        guardrail_name="sell_advice_detector",
        original_text=text
    )


def detect_timing_advice_request(text: str) -> GuardrailResult:
    """
    Detect if user is asking for market timing advice.
    
    WHY THIS EXISTS:
    - Market timing is notoriously unreliable
    - No one can consistently time the market
    - Timing advice creates false confidence
    
    PATTERNS DETECTED:
    - "When should I buy/sell?"
    - "Is this a good time to invest?"
    - "Should I wait for a dip?"
    - "Right time to enter/exit?"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if timing advice detected
    """
    patterns = [
        (r"\bwhen\s+should\s+i\s+(buy|sell|invest|exit)\b", "Timing advice request"),
        (r"\b(good|right|best)\s+time\s+to\s+(buy|sell|invest|enter|exit)\b", "Market timing request"),
        (r"\bwait\s+for\s+(a\s+)?(dip|correction|crash)\b", "Dip timing request"),
        (r"\bwait\s+and\s+watch\b", "Wait advice request"),
        (r"\btime\s+the\s+market\b", "Market timing request"),
        (r"\bbuy\s+the\s+dip\b", "Dip buying advice"),
        (r"\bentry\s+point\b", "Entry timing request"),
        (r"\bexit\s+point\b", "Exit timing request"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.ADVICE,
                guardrail_name="timing_advice_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.ADVICE,
        guardrail_name="timing_advice_detector",
        original_text=text
    )


def detect_any_advice_request(text: str) -> Tuple[bool, List[GuardrailResult]]:
    """
    Run all advice detection guardrails and return combined results.
    
    This is a convenience function that runs:
    - Buy advice detection
    - Sell advice detection
    - Timing advice detection
    
    Args:
        text: User's input text
        
    Returns:
        Tuple of (any_triggered, list_of_results)
    """
    results = [
        detect_buy_advice_request(text),
        detect_sell_advice_request(text),
        detect_timing_advice_request(text),
    ]
    
    any_triggered = any(r.triggered for r in results)
    triggered_results = [r for r in results if r.triggered]
    
    return any_triggered, triggered_results if triggered_results else results


# ═══════════════════════════════════════════════════════════════════════════════
# PANIC DETECTION GUARDRAILS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_panic_language(text: str) -> GuardrailResult:
    """
    Detect if user is expressing panic or extreme fear.
    
    WHY THIS EXISTS:
    - Panicked users need calming, not information overload
    - We should acknowledge their feelings first
    - Prevents us from inadvertently adding to anxiety
    
    PATTERNS DETECTED:
    - "Market is crashing!"
    - "I'm losing everything"
    - "Should I panic?"
    - "This is a disaster"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if panic detected
    """
    # Panic indicators with severity weights
    panic_patterns = [
        (r"\bcrash(ing|ed)?\b", "Crash language", 2),
        (r"\bpanic(king)?\b", "Panic language", 3),
        (r"\blost\s+everything\b", "Total loss fear", 3),
        (r"\bwipe(d)?\s+out\b", "Wipeout fear", 3),
        (r"\bdisaster\b", "Disaster language", 2),
        (r"\bcatastroph(e|ic)\b", "Catastrophe language", 2),
        (r"\bscared\b", "Fear expression", 2),
        (r"\bterrified\b", "Terror expression", 3),
        (r"\bfreaking\s+out\b", "Panic expression", 3),
        (r"\bcan'?t\s+sleep\b", "Anxiety indicator", 2),
        (r"\bworried\s+sick\b", "Severe worry", 2),
        (r"\bwhat\s+do\s+i\s+do\?*\!*$", "Helpless question", 2),
        (r"\bhelp\s*\!+\b", "Urgent help request", 2),
        (r"\bmarket\s+(is\s+)?(falling|tanking|bleeding)\b", "Market fear", 2),
    ]
    
    text_lower = text.lower()
    panic_score = 0
    matched_patterns = []
    
    for pattern, reason, weight in panic_patterns:
        if re.search(pattern, text_lower):
            panic_score += weight
            matched_patterns.append((pattern, reason))
    
    # Threshold: score >= 2 indicates panic
    if panic_score >= 2:
        primary_match = matched_patterns[0] if matched_patterns else (None, None)
        result = GuardrailResult(
            triggered=True,
            guardrail_type=GuardrailType.PANIC,
            guardrail_name="panic_language_detector",
            reason=f"Panic indicators detected (score: {panic_score}). Primary: {primary_match[1]}",
            matched_pattern=primary_match[0],
            original_text=text,
            severity="high" if panic_score >= 4 else "medium"
        )
        log_guardrail_trigger(result)
        return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.PANIC,
        guardrail_name="panic_language_detector",
        original_text=text
    )


def detect_urgency_language(text: str) -> GuardrailResult:
    """
    Detect if user is expressing extreme urgency.
    
    WHY THIS EXISTS:
    - Urgency often indicates emotional decision-making
    - Investment decisions shouldn't be rushed
    - We should slow down the conversation
    
    PATTERNS DETECTED:
    - "I need to act now!"
    - "Immediately"
    - "ASAP"
    - "Right now"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if urgency detected
    """
    patterns = [
        (r"\bimmediately\b", "Immediate action request"),
        (r"\bright\s+now\b", "Right now urgency"),
        (r"\basap\b", "ASAP urgency"),
        (r"\burgent(ly)?\b", "Urgent language"),
        (r"\bquick(ly)?\b", "Quick action request"),
        (r"\bhurry\b", "Hurry language"),
        (r"\bbefore\s+it'?s\s+too\s+late\b", "Time pressure"),
        (r"\blast\s+chance\b", "Last chance urgency"),
        (r"\bnow\s+or\s+never\b", "Now or never pressure"),
        (r"\!{2,}", "Multiple exclamation marks"),  # "!!" or more
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.PANIC,
                guardrail_name="urgency_language_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="medium"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.PANIC,
        guardrail_name="urgency_language_detector",
        original_text=text
    )


def detect_emotional_distress(text: str) -> Tuple[bool, List[GuardrailResult]]:
    """
    Run all panic/emotional detection guardrails.
    
    This combines:
    - Panic language detection
    - Urgency language detection
    
    Args:
        text: User's input text
        
    Returns:
        Tuple of (any_triggered, list_of_results)
    """
    results = [
        detect_panic_language(text),
        detect_urgency_language(text),
    ]
    
    any_triggered = any(r.triggered for r in results)
    triggered_results = [r for r in results if r.triggered]
    
    return any_triggered, triggered_results if triggered_results else results


# ═══════════════════════════════════════════════════════════════════════════════
# OVERCONFIDENCE / GUARANTEE DETECTION GUARDRAILS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_guarantee_request(text: str) -> GuardrailResult:
    """
    Detect if user is asking for guaranteed returns.
    
    WHY THIS EXISTS:
    - No investment can guarantee returns
    - Promising guarantees is illegal and unethical
    - Users must understand investment risk
    
    PATTERNS DETECTED:
    - "Guaranteed returns"
    - "100% safe"
    - "Risk-free investment"
    - "Assured profit"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if guarantee request detected
    """
    patterns = [
        (r"\bguarantee(d)?\s+(return|profit|gain)s?\b", "Guaranteed returns request"),
        (r"\bguaranteed\s+returns?\b", "Guaranteed returns request"),
        (r"\bgive\s+me\s+guaranteed\b", "Guaranteed request"),
        (r"\bassured\s+(return|profit|gain)s?\b", "Assured returns request"),
        (r"\bfixed\s+returns?\b", "Fixed return request"),
        (r"\brisk[- ]?free\s+(return|investment|option)\b", "Risk-free request"),
        (r"\b100\s*%\s*safe\b", "100% safe request"),
        (r"\bno\s+(risk|loss)\b", "No risk request"),
        (r"\bzero\s+risk\b", "Zero risk request"),
        (r"\bsafe\s+investment\s+with\s+high\s+return\b", "Safe high return request"),
        (r"\bdouble\s+(my|your)\s+money\b", "Double money request"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.OVERCONFIDENCE,
                guardrail_name="guarantee_request_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.OVERCONFIDENCE,
        guardrail_name="guarantee_request_detector",
        original_text=text
    )


def detect_overconfidence_in_output(text: str) -> GuardrailResult:
    """
    Detect if LLM output contains overconfident language.
    
    WHY THIS EXISTS:
    - LLM might accidentally use certainty language
    - We must catch and soften such language
    - Users shouldn't be given false confidence
    
    PATTERNS DETECTED (in LLM output):
    - "Will definitely"
    - "Guaranteed to"
    - "Certain to"
    - "100%"
    
    Args:
        text: LLM's output text
        
    Returns:
        GuardrailResult with triggered=True if overconfidence detected
    """
    patterns = [
        (r"\bwill\s+definitely\b", "Definite prediction"),
        (r"\bwill\s+certainly\b", "Certain prediction"),
        (r"\bguaranteed\s+to\b", "Guarantee language"),
        (r"\bcertain\s+to\b", "Certainty language"),
        (r"\bwithout\s+(a\s+)?doubt\b", "No doubt language"),
        (r"\b100\s*%\b", "100% certainty"),
        (r"\bno\s+risk\b", "No risk claim"),
        (r"\bcan'?t\s+(go\s+)?wrong\b", "Can't go wrong claim"),
        (r"\bsure\s+thing\b", "Sure thing language"),
        (r"\babsolutely\s+(will|certain)\b", "Absolute certainty"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.OVERCONFIDENCE,
                guardrail_name="overconfidence_output_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="high"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.OVERCONFIDENCE,
        guardrail_name="overconfidence_output_detector",
        original_text=text
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICTION DETECTION GUARDRAILS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_prediction_request(text: str) -> GuardrailResult:
    """
    Detect if user is asking for market predictions.
    
    WHY THIS EXISTS:
    - No one can reliably predict markets
    - Predictions create false expectations
    - We should educate about uncertainty instead
    
    PATTERNS DETECTED:
    - "Will market go up?"
    - "What will Nifty reach?"
    - "Predict the market"
    - "Target price for X?"
    
    Args:
        text: User's input text
        
    Returns:
        GuardrailResult with triggered=True if prediction request detected
    """
    patterns = [
        (r"\bwill\s+(the\s+)?(nifty|sensex|market|stock)\s+(go\s+)?(up|down|rise|fall|crash)\b", "Market direction prediction"),
        (r"\bwill\s+(the\s+)?market\s+go\s+(up|down)\b", "Market direction prediction"),
        (r"\bwill\s+.+\s+go\s+up\b", "Go up prediction"),
        (r"\bwhere\s+will\s+.+\s+(be|go|reach)\b", "Price target prediction"),
        (r"\bpredict\s+(the\s+)?(market|stock|price)\b", "Direct prediction request"),
        (r"\bforecast\b", "Forecast request"),
        (r"\btarget\s+price\b", "Target price request"),
        (r"\bprice\s+target\b", "Price target request"),
        (r"\bwhat\s+will\s+.+\s+(be|reach)\s+in\b", "Future value prediction"),
        (r"\bhow\s+(much|high|low)\s+will\s+.+\s+(go|reach)\b", "Price level prediction"),
        (r"\bexpected\s+(return|price|growth)\b", "Expected return request"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.PREDICTION,
                guardrail_name="prediction_request_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.PREDICTION,
        guardrail_name="prediction_request_detector",
        original_text=text
    )


def detect_prediction_in_output(text: str) -> GuardrailResult:
    """
    Detect if LLM output contains predictions.
    
    WHY THIS EXISTS:
    - LLM might accidentally make predictions
    - We must catch and remove such language
    - All predictions undermine trust
    
    Args:
        text: LLM's output text
        
    Returns:
        GuardrailResult with triggered=True if prediction detected
    """
    patterns = [
        (r"\bwill\s+(go\s+)?(up|rise|increase|grow)\b", "Upward prediction"),
        (r"\bwill\s+(go\s+)?(down|fall|decrease|drop|crash)\b", "Downward prediction"),
        (r"\bexpect(ed)?\s+to\s+(reach|hit|cross)\b", "Price expectation"),
        (r"\bshould\s+(reach|hit|cross)\s+\d+\b", "Price target"),
        (r"\blikely\s+to\s+(reach|hit|go)\b", "Likely prediction"),
        (r"\bprobably\s+will\s+(rise|fall|go)\b", "Probable prediction"),
    ]
    
    text_lower = text.lower()
    
    for pattern, reason in patterns:
        if re.search(pattern, text_lower):
            result = GuardrailResult(
                triggered=True,
                guardrail_type=GuardrailType.PREDICTION,
                guardrail_name="prediction_output_detector",
                reason=reason,
                matched_pattern=pattern,
                original_text=text,
                severity="critical"
            )
            log_guardrail_trigger(result)
            return result
    
    return GuardrailResult(
        triggered=False,
        guardrail_type=GuardrailType.PREDICTION,
        guardrail_name="prediction_output_detector",
        original_text=text
    )


# ═══════════════════════════════════════════════════════════════════════════════
# QUERY REWRITING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def rewrite_advice_query(text: str) -> Tuple[str, bool]:
    """
    Rewrite advice-seeking queries into educational questions.
    
    Instead of refusing outright, we redirect to helpful alternatives.
    
    Args:
        text: Original user query
        
    Returns:
        Tuple of (rewritten_text, was_rewritten)
    """
    rewrites = [
        # Buy advice → Risk understanding
        (
            r"should\s+i\s+buy\s+(.+?)(\?|$)",
            r"Can you help me understand the risks and considerations when evaluating \1?"
        ),
        # Sell advice → Portfolio impact
        (
            r"should\s+i\s+sell\s+(.+?)(\?|$)",
            r"Can you help me understand how \1 fits in my portfolio and what factors to consider?"
        ),
        # Best stock/fund → Evaluation criteria
        (
            r"(what|which)\s+is\s+the\s+best\s+(stock|fund|investment)",
            r"Can you help me understand how to evaluate different \2 options based on my goals?"
        ),
        # Timing → Factors
        (
            r"when\s+should\s+i\s+(buy|sell|invest)",
            r"Can you help me understand what factors influence \1 decisions?"
        ),
        # Prediction → Understanding
        (
            r"will\s+(.+?)\s+(go\s+up|rise|fall|crash)",
            r"Can you help me understand what factors might influence \1's performance?"
        ),
    ]
    
    text_lower = text.lower()
    
    for pattern, replacement in rewrites:
        if re.search(pattern, text_lower):
            rewritten = re.sub(pattern, replacement, text_lower, flags=re.IGNORECASE)
            # Capitalize first letter
            rewritten = rewritten[0].upper() + rewritten[1:]
            
            guardrail_logger.info(
                f"Query rewritten: '{text[:50]}...' -> '{rewritten[:50]}...'"
            )
            return rewritten, True
    
    return text, False


def rewrite_panic_query(text: str, user_name: str = "there") -> str:
    """
    Rewrite panic queries to acknowledge feelings first.
    
    Args:
        text: Original user query
        user_name: User's name for personalization
        
    Returns:
        Rewritten query with acknowledgment prefix
    """
    # Don't rewrite, but add context for the LLM
    acknowledgment = (
        f"[USER CONTEXT: The user appears anxious or concerned. "
        f"Please acknowledge their feelings first before providing information.]\n\n"
    )
    return acknowledgment + text


# ═══════════════════════════════════════════════════════════════════════════════
# OUTPUT SANITIZATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def sanitize_advice_language(text: str) -> str:
    """
    Remove or soften advice-giving language from LLM output.
    
    Args:
        text: LLM output text
        
    Returns:
        Sanitized text with advice language removed/softened
    """
    replacements = [
        (r"\byou\s+should\s+(buy|sell|invest|exit)\b", "you might consider"),
        (r"\bi\s+recommend\s+(buying|selling|investing)\b", "one approach could be"),
        (r"\bi\s+advise\s+(you\s+to)?\b", "you could consider"),
        (r"\bmy\s+advice\s+is\b", "one perspective is"),
        (r"\bbuy\s+this\b", "consider this"),
        (r"\bsell\s+this\b", "review this"),
        (r"\byou\s+must\s+(buy|sell|invest)\b", "you might want to consider"),
    ]
    
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result


def sanitize_prediction_language(text: str) -> str:
    """
    Remove or soften prediction language from LLM output.
    
    Args:
        text: LLM output text
        
    Returns:
        Sanitized text with predictions removed/softened
    """
    replacements = [
        (r"\bwill\s+(definitely|certainly)\s+(go\s+up|rise)\b", "may potentially increase"),
        (r"\bwill\s+(definitely|certainly)\s+(go\s+down|fall)\b", "may potentially decrease"),
        (r"\bwill\s+(go\s+up|rise|increase)\b", "may fluctuate"),
        (r"\bwill\s+(go\s+down|fall|decrease)\b", "may fluctuate"),
        (r"\bexpect(ed)?\s+to\s+reach\s+(\d+)\b", r"historically has been around \2"),
        (r"\bshould\s+reach\s+(\d+)\b", r"has varied around \1"),
    ]
    
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result


def sanitize_overconfidence_language(text: str) -> str:
    """
    Soften overconfident language in LLM output.
    
    Args:
        text: LLM output text
        
    Returns:
        Sanitized text with confidence softened
    """
    replacements = [
        (r"\bdefinitely\b", "likely"),
        (r"\bcertainly\b", "probably"),
        (r"\bguaranteed\b", "expected"),
        (r"\babsolutely\b", "generally"),
        (r"\bwithout\s+(a\s+)?doubt\b", "in most cases"),
        (r"\b100%\b", "very likely"),
        (r"\bno\s+risk\b", "lower risk"),
        (r"\bcan'?t\s+go\s+wrong\b", "has historically performed well"),
        (r"\bsure\s+thing\b", "reasonable option"),
    ]
    
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result


def sanitize_output(text: str) -> Tuple[str, List[str]]:
    """
    Apply all output sanitization functions.
    
    Args:
        text: LLM output text
        
    Returns:
        Tuple of (sanitized_text, list_of_sanitizations_applied)
    """
    sanitizations = []
    result = text
    
    # Check and sanitize advice language
    new_result = sanitize_advice_language(result)
    if new_result != result:
        sanitizations.append("advice_language")
        result = new_result
    
    # Check and sanitize prediction language
    new_result = sanitize_prediction_language(result)
    if new_result != result:
        sanitizations.append("prediction_language")
        result = new_result
    
    # Check and sanitize overconfidence language
    new_result = sanitize_overconfidence_language(result)
    if new_result != result:
        sanitizations.append("overconfidence_language")
        result = new_result
    
    if sanitizations:
        guardrail_logger.info(f"Output sanitized: {sanitizations}")
    
    return result, sanitizations


# ═══════════════════════════════════════════════════════════════════════════════
# COMPOSITE GUARDRAIL RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

class GuardrailRunner:
    """
    Runs all guardrails and returns comprehensive results.
    
    This class provides a unified interface for running guardrails
    and handling their results.
    """
    
    # Pre-LLM guardrails (run on user input)
    PRE_LLM_GUARDRAILS: List[Callable[[str], GuardrailResult]] = [
        detect_buy_advice_request,
        detect_sell_advice_request,
        detect_timing_advice_request,
        detect_panic_language,
        detect_urgency_language,
        detect_guarantee_request,
        detect_prediction_request,
    ]
    
    # Post-LLM guardrails (run on LLM output)
    POST_LLM_GUARDRAILS: List[Callable[[str], GuardrailResult]] = [
        detect_overconfidence_in_output,
        detect_prediction_in_output,
    ]
    
    @classmethod
    def run_pre_llm(cls, text: str) -> Tuple[List[GuardrailResult], bool, str]:
        """
        Run all pre-LLM guardrails.
        
        Args:
            text: User input text
            
        Returns:
            Tuple of (results, should_block, action)
            - results: List of all guardrail results
            - should_block: Whether to block the query
            - action: Recommended action (refuse, rewrite, proceed, calm)
        """
        results = []
        
        for guardrail in cls.PRE_LLM_GUARDRAILS:
            result = guardrail(text)
            results.append(result)
        
        # Determine action based on results
        triggered = [r for r in results if r.triggered]
        
        if not triggered:
            return results, False, "proceed"
        
        # Check for critical violations (must refuse)
        critical = [r for r in triggered if r.severity == "critical"]
        if critical:
            return results, True, "refuse"
        
        # Check for panic (special handling)
        panic = [r for r in triggered if r.guardrail_type == GuardrailType.PANIC]
        if panic:
            return results, False, "calm"
        
        # Other violations (try to rewrite)
        return results, False, "rewrite"
    
    @classmethod
    def run_post_llm(cls, text: str) -> Tuple[List[GuardrailResult], str]:
        """
        Run all post-LLM guardrails and sanitize output.
        
        Args:
            text: LLM output text
            
        Returns:
            Tuple of (results, sanitized_text)
        """
        results = []
        
        for guardrail in cls.POST_LLM_GUARDRAILS:
            result = guardrail(text)
            results.append(result)
        
        # Sanitize the output
        sanitized_text, _ = sanitize_output(text)
        
        return results, sanitized_text
    
    @classmethod
    def get_summary(cls, results: List[GuardrailResult]) -> dict:
        """
        Get a summary of guardrail results for logging/debugging.
        
        Args:
            results: List of guardrail results
            
        Returns:
            Summary dictionary
        """
        triggered = [r for r in results if r.triggered]
        
        return {
            "total_checks": len(results),
            "triggered_count": len(triggered),
            "triggered_guardrails": [r.guardrail_name for r in triggered],
            "severities": [r.severity for r in triggered],
            "types": [r.guardrail_type.value for r in triggered],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def is_safe_query(text: str) -> bool:
    """
    Quick check if a query is safe to process.
    
    Args:
        text: User input text
        
    Returns:
        True if safe, False if should be blocked
    """
    _, should_block, _ = GuardrailRunner.run_pre_llm(text)
    return not should_block


def get_query_action(text: str) -> str:
    """
    Get recommended action for a query.
    
    Args:
        text: User input text
        
    Returns:
        Action string: "proceed", "refuse", "rewrite", or "calm"
    """
    _, _, action = GuardrailRunner.run_pre_llm(text)
    return action


def safe_process_output(text: str) -> str:
    """
    Process LLM output through all post-LLM guardrails.
    
    Args:
        text: LLM output text
        
    Returns:
        Sanitized output text
    """
    _, sanitized = GuardrailRunner.run_post_llm(text)
    return sanitized

