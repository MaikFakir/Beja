#!/usr/bin/env python3
"""
AI Code Guardian CLI Tool (guardian.py)
---------------------------------------
Automated validation, regression detection, and security auditing for AI-assisted development.

Usage:
    python guardian.py audit <path>               # Static audit for security, secrets, and anti-patterns
    python guardian.py diff-check                 # Inspects git diff for deleted symbols, DOM IDs, and churn
    python guardian.py extract-invariants <file>  # Extracts existing functions, classes, DOM IDs, and exports
    python guardian.py verify-invariants <before.json> <after.json> # Compares snapshots to ensure nothing broke
"""

import os
import sys
import re
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Set, Any, Tuple

# Regex patterns for security, secrets and anti-patterns
SECRET_PATTERNS = [
    (r"(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9_\-\.]{12,}['\"]", "Exposed Secret / API Key"),
    (r"(?i)firebaseConfig\s*=\s*\{[^}]*apiKey:\s*['\"][A-Za-z0-9_\-]{20,}['\"]", "Hardcoded Firebase API Key"),
    (r"-----BEGIN (?:RSA )?PRIVATE KEY-----", "Hardcoded RSA/SSH Private Key"),
    (r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"][^'\"]{6,}['\"]", "Hardcoded Password")
]

LAZY_EDIT_PATTERNS = [
    (r"//\s*\.\.\.\s*(?:rest|existing|remaining|code|resto|demas).*?(?:unchanged|stays|aqui|igual)?", "Lazy Comment Truncation (risk of code erasure)"),
    (r"/\*\s*\.\.\.\s*(?:rest|existing|remaining|code|resto).*?\*/", "Lazy Block Comment Truncation"),
    (r"#\s*\.\.\.\s*(?:rest|existing|remaining|code)", "Lazy Python Comment Truncation")
]

DANGEROUS_PATTERNS = [
    (r"\.innerHTML\s*=", "Unsanitized innerHTML assignment (XSS risk - prefer textContent or sanitized DOM API)"),
    (r"\beval\s*\(", "Use of eval() (Remote code execution risk)"),
    (r"document\.write\s*\(", "Use of document.write() (Performance and security anti-pattern)"),
    (r"!\s*important", "Use of CSS !important (Specificity war anti-pattern)")
]

DOM_ID_PATTERN = re.compile(r"""(?:id|getElementById|querySelector\(['"]#)\s*[:=]\s*['"]([A-Za-z0-9_\-]+)['"]|id=['"]([A-Za-z0-9_\-]+)['"]""")
JS_FUNCTION_PATTERN = re.compile(r"""(?:function\s+([A-Za-z0-9_$]+)\s*\(|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?function\s*([A-Za-z0-9_$]+)\s*\(|([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{)""")
PY_FUNCTION_PATTERN = re.compile(r"""(?:def|class)\s+([A-Za-z0-9_]+)\s*[(:]""")


def audit_file(filepath: Path) -> List[Dict[str, Any]]:
    """Audits a single file for secrets, lazy comments, and dangerous patterns."""
    findings = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return [{"file": str(filepath), "line": 0, "severity": "ERROR", "message": f"Could not read file: {e}"}]

    lines = content.splitlines()

    for idx, line in enumerate(lines, 1):
        # 1. Check secrets
        for pattern, desc in SECRET_PATTERNS:
            if re.search(pattern, line):
                findings.append({
                    "file": str(filepath),
                    "line": idx,
                    "severity": "CRITICAL",
                    "category": "Security",
                    "message": f"{desc} detected on line {idx}"
                })

        # 2. Check lazy edit truncation (code files only)
        if filepath.suffix.lower() in [".js", ".ts", ".html", ".css", ".py", ".jsx", ".tsx"]:
            for pattern, desc in LAZY_EDIT_PATTERNS:
                if re.search(pattern, line):
                    findings.append({
                        "file": str(filepath),
                        "line": idx,
                        "severity": "HIGH",
                        "category": "Coding Integrity",
                        "message": f"{desc} detected on line {idx}. Never use ellipsis placeholders that truncate existing logic!"
                    })

            for pattern, desc in DANGEROUS_PATTERNS:
                if re.search(pattern, line):
                    findings.append({
                        "file": str(filepath),
                        "line": idx,
                        "severity": "MEDIUM",
                        "category": "Best Practices",
                        "message": f"{desc} on line {idx}"
                    })

    return findings


def run_audit(target_path: str) -> int:
    """Recursively audits target directory or file."""
    path = Path(target_path)
    if not path.exists():
        print(f"[ERROR] Path does not exist: {target_path}")
        return 1

    files_to_check = []
    ignored_dirs = {".git", "node_modules", "dist", "build", ".venv", "venv", "__pycache__"}

    if path.is_file():
        files_to_check.append(path)
    else:
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for f in files:
                ext = Path(f).suffix.lower()
                if ext in {".js", ".ts", ".html", ".css", ".py", ".json", ".md"}:
                    files_to_check.append(Path(root) / f)

    print(f"\n=======================================================")
    print(f" 🛡️  AI CODE GUARDIAN: STATIC SECURITY & INTEGRITY AUDIT")
    print(f"=======================================================")
    print(f"Auditing {len(files_to_check)} files in: {path.resolve()}\n")

    all_findings = []
    for f in files_to_check:
        res = audit_file(f)
        all_findings.extend(res)

    criticals = [f for f in all_findings if f.get("severity") == "CRITICAL"]
    highs = [f for f in all_findings if f.get("severity") == "HIGH"]
    mediums = [f for f in all_findings if f.get("severity") == "MEDIUM"]

    for item in all_findings:
        sev = item['severity']
        color_mark = "🔴" if sev == "CRITICAL" else ("🟠" if sev == "HIGH" else "🟡")
        print(f"{color_mark} [{sev}] [{item.get('category', 'Audit')}] {item['file']}:{item['line']}")
        print(f"    -> {item['message']}")

    print("\n-------------------------------------------------------")
    print(f"Summary: {len(all_findings)} finding(s) | 🔴 {len(criticals)} Critical | 🟠 {len(highs)} High | 🟡 {len(mediums)} Medium")
    print("-------------------------------------------------------\n")

    if criticals or highs:
        print("❌ AUDIT FAILED: Critical or High-severity issues must be resolved before proceeding.")
        return 1
    else:
        print("✅ AUDIT PASSED: No blocking issues found.")
        return 0


def extract_invariants(filepath: str) -> Dict[str, Any]:
    """Extracts functions, classes, DOM IDs, and exports from a file."""
    path = Path(filepath)
    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    content = path.read_text(encoding="utf-8", errors="ignore")
    ext = path.suffix.lower()

    dom_ids = set()
    for match in DOM_ID_PATTERN.finditer(content):
        for g in match.groups():
            if g and len(g) > 1 and not g.startswith(" "):
                dom_ids.add(g)

    symbols = set()
    if ext in [".js", ".ts", ".jsx", ".tsx"]:
        for match in JS_FUNCTION_PATTERN.finditer(content):
            for g in match.groups():
                if g and not g in {"if", "for", "while", "switch", "catch"}:
                    symbols.add(g)
    elif ext == ".py":
        for match in PY_FUNCTION_PATTERN.finditer(content):
            for g in match.groups():
                if g:
                    symbols.add(g)

    return {
        "file": str(path.resolve()),
        "dom_ids": sorted(list(dom_ids)),
        "symbols": sorted(list(symbols)),
        "line_count": len(content.splitlines())
    }


def run_extract_invariants(filepath: str, output: str = None) -> int:
    data = extract_invariants(filepath)
    formatted = json.dumps(data, indent=2)
    if output:
        Path(output).write_text(formatted, encoding="utf-8")
        print(f"✅ Invariants snapshot written to: {output}")
    else:
        print(formatted)
    return 0


def run_verify_invariants(before_path: str, after_path: str) -> int:
    """Verifies that no prior functions, DOM IDs, or symbols were unintentionally deleted."""
    try:
        before = json.loads(Path(before_path).read_text(encoding="utf-8"))
        after = json.loads(Path(after_path).read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[ERROR] Failed to load invariant snapshots: {e}")
        return 1

    before_symbols = set(before.get("symbols", []))
    after_symbols = set(after.get("symbols", []))
    missing_symbols = before_symbols - after_symbols

    before_dom = set(before.get("dom_ids", []))
    after_dom = set(after.get("dom_ids", []))
    missing_dom = before_dom - after_dom

    print(f"\n=======================================================")
    print(f" 🛡️  AI CODE GUARDIAN: INVARIANT PRESERVATION CHECK")
    print(f"=======================================================")
    print(f"Target File: {before.get('file', 'Unknown')}")
    print(f"Before: {len(before_symbols)} symbols, {len(before_dom)} DOM IDs")
    print(f"After : {len(after_symbols)} symbols, {len(after_dom)} DOM IDs\n")

    has_regressions = False

    if missing_symbols:
        has_regressions = True
        print(f"❌ REGRESSION DETECTED: {len(missing_symbols)} previously functional symbol(s) were deleted or renamed:")
        for s in sorted(missing_symbols):
            print(f"    - Missing Symbol: {s}")

    if missing_dom:
        has_regressions = True
        print(f"❌ REGRESSION DETECTED: {len(missing_dom)} DOM ID(s) were deleted or renamed:")
        for d in sorted(missing_dom):
            print(f"    - Missing DOM ID: #{d}")

    if not has_regressions:
        print("✅ ZERO REGRESSIONS: All existing symbols and DOM IDs are fully preserved.")
        return 0
    else:
        print("\n⚠️  BLOCKED: The modification deleted existing functionality. Please reinstate preserved invariants.")
        return 1


def run_diff_check() -> int:
    """Runs git diff analysis to identify suspicious deletions, high churn, or regressions."""
    try:
        diff_res = subprocess.run(["git", "diff", "--unified=1"], capture_output=True, text=True, check=True)
        stat_res = subprocess.run(["git", "diff", "--stat"], capture_output=True, text=True, check=True)
    except Exception as e:
        print(f"[ERROR] Git command failed: {e}")
        return 1

    diff_text = diff_res.stdout
    stat_text = stat_res.stdout

    if not diff_text.strip():
        print("ℹ️  No unstaged git changes found to inspect.")
        return 0

    print(f"\n=======================================================")
    print(f" 🛡️  AI CODE GUARDIAN: GIT DIFF INTEGRITY AUDIT")
    print(f"=======================================================")
    print("Git Diff Summary:")
    print(stat_text.strip())
    print("\nAnalyzing modified hunks...")

    deleted_lines = [l for l in diff_text.splitlines() if l.startswith("-") and not l.startswith("---")]
    added_lines = [l for l in diff_text.splitlines() if l.startswith("+") and not l.startswith("+++")]

    print(f"Lines added: {len(added_lines)} | Lines deleted: {len(deleted_lines)}")

    warnings = []
    # Check for lazy comments in added lines
    for line in added_lines:
        for pattern, desc in LAZY_EDIT_PATTERNS:
            if re.search(pattern, line):
                warnings.append(f"Lazy comment introduced in diff: {line.strip()}")

    # Check for removed functions in deleted lines
    for line in deleted_lines:
        if any(kw in line for kw in ["function ", "def ", "class ", "export ", "addEventListener"]):
            warnings.append(f"Potential deleted function/listener: {line.strip()}")

    if warnings:
        print(f"\n⚠️  {len(warnings)} Warning(s) detected in git diff:")
        for w in warnings:
            print(f"    - {w}")
        return 1
    else:
        print("\n✅ Git diff inspection passed cleanly. No suspicious deletions or lazy patterns found.")
        return 0


def main():
    parser = argparse.ArgumentParser(description="AI Code Guardian Verification CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # audit subcommand
    audit_parser = subparsers.add_parser("audit", help="Run static security and integrity audit on files")
    audit_parser.add_argument("path", help="Path to file or directory to audit")

    # diff-check subcommand
    subparsers.add_parser("diff-check", help="Audit unstaged git diff for regressions and lazy comments")

    # extract-invariants subcommand
    extract_parser = subparsers.add_parser("extract-invariants", help="Extract existing symbols and DOM IDs")
    extract_parser.add_argument("file", help="File to inspect")
    extract_parser.add_argument("--output", "-o", help="Optional output JSON file")

    # verify-invariants subcommand
    verify_parser = subparsers.add_parser("verify-invariants", help="Compare before and after invariant snapshots")
    verify_parser.add_argument("before", help="Path to before.json snapshot")
    verify_parser.add_argument("after", help="Path to after.json snapshot")

    args = parser.parse_args()

    if args.command == "audit":
        sys.exit(run_audit(args.path))
    elif args.command == "diff-check":
        sys.exit(run_diff_check())
    elif args.command == "extract-invariants":
        sys.exit(run_extract_invariants(args.file, args.output))
    elif args.command == "verify-invariants":
        sys.exit(run_verify_invariants(args.before, args.after))


if __name__ == "__main__":
    main()
