---
name: ai-code-guardian
description: >-
  Super Skill for AI-assisted software development, non-destructive code modifications, regression shielding, and enterprise quality control.
  Enforces strict invariants across Design (UI/UX), Security (OWASP Top 10 Web & LLM), Structuring (DRY, anti-churn), and Coding (zero context rot).
  Use this skill whenever:
  - Planning or applying modifications, updates, refactors, or new features to existing code.
  - Validating AI-suggested code changes to ensure existing functionality, DOM IDs, event listeners, and API contracts remain intact.
  - Performing security audits, secret leakage checks, and vulnerability reviews before committing.
  - Reviewing git diffs for code churn, lazy truncation comments, and unintended deletions.
  - Enforcing design tokens, CSS cascade safety, and responsive layout integrity.
risk: safe
source: official
version: 1.0.0
date_added: "2026-09-17"
---

# AI Code Guardian (`ai-code-guardian`)
## Enterprise Standard for Safe, Non-Destructive AI Software Engineering

`ai-code-guardian` is an advanced operational framework designed to eliminate the primary failure modes of AI-generated code: **silent regressions, architectural decay, security vulnerabilities, design clobbering, and loss of existing functionality**.

```
                ┌────────────────────────────────────────────────────────┐
                │          USER CHANGE REQUEST / FEATURE UPDATE          │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
               ┌──────────────────────────────────────────────────────────┐
               │    PHASE 1: PRE-CHECK (IMPACT & INVARIANT FORMULATION)   │
               │  - Extract existing symbols, DOM IDs, and API contracts  │
               │  - Formulate non-negotiable Preservation Invariants      │
               └────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
               ┌──────────────────────────────────────────────────────────┐
               │    PHASE 2: SURGICAL NON-DESTRUCTIVE MODIFICATION        │
               │  - Minimal atomic diffs (replace_file_content ONLY)      │
               │  - Zero lazy comments (`// ... rest unchanged`)          │
               │  - Mandatory reuse of existing utility functions (DRY)   │
               └────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
               ┌──────────────────────────────────────────────────────────┐
               │    PHASE 3: MULTI-AGENT CRITIQUE & INVARIANT AUDIT       │
               │  - Automated CLI verification (`guardian.ps1` / `.py`)   │
               │  - Diff analysis: deleted symbols, DOM nodes, listeners  │
               │  - Security & Secrets check (OWASP Web & LLM)            │
               └────────────────────────────┬─────────────────────────────┘
                                            │
                                   [Regressions Found?]
                                    /                 \
                                  YES                  NO
                                  /                     \
                                 ▼                       ▼
               ┌───────────────────────────────┐  ┌───────────────────────┐
               │  PHASE 4A: AUTO-REMEDIATION   │  │   PHASE 4B: PASS      │
               │  - Restore broken invariants  │  │  - Deliver verified   │
               │  - Rollback if unrecoverable  │  │    non-breaking code  │
               └───────────────────────────────┘  └───────────────────────┘
```

---

## 1. The 4 Pillars of AI Code Defense

Based on empirical research (GitClear, OWASP Foundation, SonarSource, Snyk), AI coding assistants fail in predictable ways. `ai-code-guardian` erects defenses against all four:

### 1.1 Pillar 1: Design & UI/UX Integrity (`references/design_standards.md`)
*   **The Pitfall**: AI generates scoped styles that override global design systems using `!important`, deeply nested selectors, or hardcoded hex colors ("AI visual slop"). In responsive design, it relies on rigid `px` widths that collapse on mobile devices or break under zoom (WCAG 1.4.4).
*   **The Guard**:
    1. Mandatory reuse of established CSS custom properties / design tokens (`--primary`, spacing scales).
    2. Fluid intrinsic layout primitives (`clamp()`, `minmax()`, `grid`, `flex`, `@container`) instead of fragile fixed breakpoints.
    3. Strict ban on `!important` and inline style overrides that clobber the cascade.
    4. Accessibility preservation: contrast ratios, ARIA landmarks, and focus rings must never be removed.

### 1.2 Pillar 2: Enterprise Security (`references/security_playbook.md`)
*   **The Pitfall**: AI prioritizes "making it work" over security, frequently omitting authorization checks, output encoding, or input validation. It also suffers from package hallucination and accidental credential exposure.
*   **The Guard**:
    1. **Zero Secret Hardcoding**: API keys, bearer tokens, passwords, and private keys are strictly forbidden in code and configs.
    2. **XSS & Injection Shield**: Ban raw string concatenation in SQL/NoSQL and unescaped `element.innerHTML = userInput`. Use `textContent` or sanitized DOM node creation.
    3. **Supply Chain Verification**: Ban hallucinated imports; every imported module must exist in declared dependencies (`package.json` / `requirements.txt`).
    4. **OWASP LLM Defense**: Treat all AI-generated or user-provided content as untrusted input before rendering or executing.

### 1.3 Pillar 3: Structuring & Anti-Churn Architecture (`references/structuring_rules.md`)
*   **The Pitfall**: "The Itinerant Contributor" pattern (GitClear). AI copies-and-pastes new helper functions rather than finding and reusing existing utilities, causing skyrocketing code churn, duplicated logic (DRY violations), and fragmented architectures.
*   **The Guard**:
    1. **Search Before Authoring**: Before creating a helper, search the repository for existing implementations.
    2. **Single Responsibility & Modularity**: Keep files focused; prevent "god modules" that mix presentation, state management, and network I/O.
    3. **Preserve Architectural Patterns**: Do not introduce disparate paradigms (e.g., mixing jQuery into a modern vanilla ESM architecture).
    4. **Stable Contracts**: Module interfaces, exported functions, and data schemas must be backward-compatible.

### 1.4 Pillar 4: Coding & Regression Shield (`references/coding_invariants.md`)
*   **The Pitfall**: "Context Rot" causes the AI to forget constraints from previous turns, accidentally deleting legacy edge-case handlers, DOM element IDs, or event listeners when fulfilling a new request.
*   **The Guard**:
    1. **Preservation of Invariants**: Existing function signatures, return types, DOM IDs, and event handlers are non-negotiable invariants.
    2. **Strict Ban on Lazy Comments**: Phrases like `// ... rest of code stays here ...` or `/* ... existing code ... */` are strictly prohibited. Every replacement chunk must be syntactically complete.
    3. **Anti-Phantom Fixes**: Never mask bugs with empty `try/catch` blocks or deleted test assertions.
    4. **Surgical Precision**: Edits must be localized using minimum contiguous chunks. Never overwrite an entire 600-line file when only updating 5 lines.

---

## 2. Progressive Disclosure Index & Navigation

For detailed manuals, workflows, and prompts, navigate the modular documentation tree:

### 2.1 Deep Reference Manuals (`references/`)
- **[Design & CSS Standards](references/design_standards.md)**: Cascade safety, design tokens, responsive typography, and mobile-first container patterns.
- **[Security Playbook](references/security_playbook.md)**: OWASP Top 10 Web & LLM mitigations, zero-secret policies, input sanitization, and secure DOM handling.
- **[Structuring & Modularity Rules](references/structuring_rules.md)**: Anti-churn guidelines, DRY enforcement, cohesion, and dependency management.
- **[Coding Invariants & Regression Prevention](references/coding_invariants.md)**: Contract preservation, DOM ID protection, and anti-lazy editing rules.

### 2.2 Operational Workflows (`workflows/`)
- **[Safe Change Protocol](workflows/safe_change_protocol.md)**: Step-by-step 4-phase execution checklist for any update or modification.
- **[Regression Recovery Protocol](workflows/regression_recovery.md)**: Incident response and rollback procedures when a regression is caught.
- **[Quality Review Gate](workflows/review_gate.md)**: Pre-flight acceptance criteria before presenting diffs to the user.

### 2.3 Multi-Agent Prompts (`prompts/`)
- **[Change Critic Subagent](prompts/change_critic.md)**: Blind adversarial inspection of diffs for subtle breakage, dropped edge cases, or security flaws.
- **[Invariant Verifier Subagent](prompts/invariant_verifier.md)**: Contract and symbol verification comparing pre- and post-edit states.

### 2.4 Automation Scripts (`scripts/`)
- **[PowerShell Guardian (`guardian.ps1`)](scripts/guardian.ps1)**: Zero-dependency native Windows CLI for auditing, diff checking, and invariant extraction.
- **[Python Guardian (`guardian.py`)](scripts/guardian.py)**: Cross-platform Python CLI for automated security and integrity checks.

### 2.5 Resources & Examples
- **[Quality Checklist Schema](resources/quality_checklist.json)**: Machine-readable acceptance schema.
- **[Safe Update Example Walkthrough](examples/safe_update_example.md)**: Practical case study showing safe refactoring of a live UI.

---

## 3. Automation Tools Quick Reference

Use the bundled guardian scripts directly in your terminal:

### PowerShell (Windows Native - Recommended)
```powershell
# 1. Run static security & integrity audit
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -Audit .

# 2. Inspect git diff for regressions, deleted listeners, and lazy comments
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck

# 3. Snapshot invariants before editing a file
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants index.html -OutFile before.json

# 4. Verify invariants after editing
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants index.html -OutFile after.json
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json
```

### Python (Cross-Platform)
```bash
python .agents/skills/ai-code-guardian/scripts/guardian.py audit .
python .agents/skills/ai-code-guardian/scripts/guardian.py diff-check
python .agents/skills/ai-code-guardian/scripts/guardian.py extract-invariants index.html -o before.json
python .agents/skills/ai-code-guardian/scripts/guardian.py verify-invariants before.json after.json
```

---

## 4. Integration with `multiagent-reasoning`

When modifying critical, high-risk, or complex modules, `ai-code-guardian` seamlessly orchestrates with the workspace's `multiagent-reasoning` framework:

1. **Planner Archetype**: Analyzes user request and formulates Invariant Preservation List.
2. **Synthesizer Archetype**: Executes surgical, non-destructive file edits using `replace_file_content`.
3. **Critic Archetype** (via `prompts/change_critic.md`): Performs blind adversarial critique on the resulting `git diff`.
4. **Verifier Archetype** (via `prompts/invariant_verifier.md`): Executes automated snapshot comparison using `guardian.ps1`.
