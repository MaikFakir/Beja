#!/usr/bin/env python3
"""
Test runner script for Antigravity Multi-Agent Reasoning Framework test suite.
Executes pytest with detailed reporting and exit code propagation.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

try:
    import pytest

    def run():
        test_file = str(PROJECT_ROOT / "tests" / "test_skill.py")
        args = ["-v", "-s", "--tb=short", test_file] + sys.argv[1:]
        print(f"Running pytest with args: {args}")
        exit_code = pytest.main(args)
        sys.exit(exit_code)

    if __name__ == "__main__":
        run()

except ImportError:
    # If pytest is not installed, provide a lightweight standard library test executor
    import unittest
    print("pytest not found in environment, running basic test assertions via Python...")
    from scripts.validate_skill import SkillValidator
    from tests.conftest import mock_valid_skill

    # Run full verification on project root
    validator = SkillValidator(target_dir=PROJECT_ROOT, strict=True, verbose=True)
    report = validator.validate_all()
    print(f"Validation on project skill: Passed={report.total_passed}, Failed={report.total_failed}, Valid={report.is_valid}")
    sys.exit(0 if report.is_valid else 1)
