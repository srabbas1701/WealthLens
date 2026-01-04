#!/usr/bin/env python3
"""
WealthLens Test Runner
======================

Run all tests for the Copilot system.

Usage:
    python run_tests.py                 # Run all tests
    python run_tests.py -v              # Verbose output
    python run_tests.py -k "panic"      # Run only tests matching "panic"
    python run_tests.py --cov           # Run with coverage report
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_tests():
    """Run the test suite."""
    import pytest
    
    # Get the directory containing this script
    test_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Default arguments
    args = [
        test_dir,
        "-v",
        "--tb=short",
        "-x",  # Stop on first failure
    ]
    
    # Add any command line arguments
    args.extend(sys.argv[1:])
    
    # Run pytest
    exit_code = pytest.main(args)
    
    return exit_code


def run_quick_validation():
    """
    Run a quick validation of the guardrail system.
    This can be used as a smoke test before deployment.
    """
    print("=" * 60)
    print("WEALTHLENS - QUICK VALIDATION")
    print("=" * 60)
    
    from guardrail_functions import (
        detect_buy_advice_request,
        detect_sell_advice_request,
        detect_panic_language,
        detect_guarantee_request,
        detect_prediction_request,
        GuardrailRunner,
    )
    
    test_cases = [
        # (query, expected_action, description)
        ("How is my portfolio doing?", "proceed", "Safe portfolio query"),
        ("Should I buy HDFC Bank?", "refuse", "Buy advice request"),
        ("Should I sell everything?", "refuse", "Sell advice request"),
        ("Will the market go up?", "refuse", "Prediction request"),
        ("Give me guaranteed returns", "refuse", "Guarantee request"),
        ("I'm panicking! Market is crashing!", "calm", "Panic query"),
        ("Explain diversification", "proceed", "Educational query"),
    ]
    
    passed = 0
    failed = 0
    
    for query, expected_action, description in test_cases:
        _, should_block, action = GuardrailRunner.run_pre_llm(query)
        
        # Check if action matches expected
        if action == expected_action:
            status = "[PASS]"
            passed += 1
        else:
            status = f"[FAIL] (expected {expected_action}, got {action})"
            failed += 1
        
        print(f"{status}: {description}")
        print(f"   Query: {query[:50]}...")
        print()
    
    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


def run_output_validation():
    """
    Validate that output sanitization works correctly.
    """
    print("\n" + "=" * 60)
    print("OUTPUT SANITIZATION VALIDATION")
    print("=" * 60)
    
    from guardrail_functions import sanitize_output
    
    test_outputs = [
        "You should definitely buy this stock now.",
        "I recommend selling your holdings immediately.",
        "The market will certainly go up next month.",
        "This is guaranteed to give 20% returns.",
        "Your portfolio is well-diversified.",  # Safe, should pass through
    ]
    
    for output in test_outputs:
        sanitized, changes = sanitize_output(output)
        
        if changes:
            print(f"[SANITIZED]:")
            print(f"   Original: {output}")
            print(f"   Cleaned:  {sanitized}")
            print(f"   Changes:  {changes}")
        else:
            print(f"[PASSED]: {output[:50]}...")
        print()
    
    print("=" * 60)


if __name__ == "__main__":
    if "--quick" in sys.argv:
        # Quick validation mode
        success = run_quick_validation()
        run_output_validation()
        sys.exit(0 if success else 1)
    else:
        # Full test suite
        exit_code = run_tests()
        sys.exit(exit_code)

