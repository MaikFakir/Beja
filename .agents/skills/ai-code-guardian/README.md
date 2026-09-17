# AI Code Guardian 🛡️
## Enterprise Framework for Non-Destructive AI Software Engineering

> **"Move fast with AI, but never break what already works."**

### Why AI Code Guardian?
Generative AI models are exceptional at rapid implementation, but notoriously prone to **destructive edits**:
1. **Regressions & Context Rot**: As conversations get longer, the AI forgets existing constraints and silently replaces sophisticated edge-case handling with naive snippets.
2. **Loss of Functionality**: When asked to modify a single button or color, models frequently rewrite whole files, dropping DOM IDs, event listeners, or exported functions that other modules depend on.
3. **The "Itinerant Contributor" Problem (GitClear Research)**: AI assistants increase code churn and code duplication by reinventing existing utility functions instead of reusing them.
4. **Security Blind Spots (OWASP Top 10)**: AI optimizes for "happy paths," often omitting input sanitization, leaving APIs exposed to injection, or hardcoding credentials.
5. **CSS Clobbering & UI Slop**: AI introduces `!important` and rigid fixed pixel dimensions that break design tokens and crush mobile responsiveness.

`ai-code-guardian` establishes a deterministic safety harness around the AI paired programming workflow.

---

## Directory Architecture

```
.agents/skills/ai-code-guardian/
├── SKILL.md                          # Main Skill Manifest & Progressive Disclosure Index
├── README.md                         # Framework Overview and Philosophy
│
├── workflows/                        # Step-by-Step Operational Protocols
│   ├── safe_change_protocol.md       # The 4-Phase Safe Change Lifecycle
│   ├── regression_recovery.md        # Rollback and Self-Correction Runbook
│   └── review_gate.md                # Pre-delivery Verification Checklist
│
├── references/                       # Deep Engineering Reference Manuals
│   ├── design_standards.md           # Pillar 1: UI/UX, CSS Cascade Safety & Responsiveness
│   ├── security_playbook.md          # Pillar 2: OWASP Top 10 Web & LLM Mitigations
│   ├── structuring_rules.md          # Pillar 3: Anti-Churn, DRY & Modular Cohesion
│   └── coding_invariants.md          # Pillar 4: Invariant Formulation & Contract Shield
│
├── prompts/                          # Multi-Agent Subagent Prompts
│   ├── change_critic.md              # Adversarial Diff Critic Subagent
│   └── invariant_verifier.md         # Invariant & Contract Verifier Subagent
│
├── scripts/                          # Automated Verification CLIs
│   ├── guardian.ps1                  # Native Windows PowerShell Verification Engine
│   └── guardian.py                   # Cross-Platform Python Verification Engine
│
├── resources/
│   └── quality_checklist.json        # Machine-Readable Quality Gate Specification
│
└── examples/
    └── safe_update_example.md        # End-to-End Walkthrough of a Non-Destructive Update
```

---

## The 4-Phase Operational Protocol

Every modification prompted by the user follows this strict lifecycle:

```
[User Request] 
      │
      ▼
1. Pre-Check: Formulate Invariants & Extract Symbols (`guardian.ps1 -ExtractInvariants`)
      │
      ▼
2. Surgical Edit: Apply minimal atomic diff (`replace_file_content` only)
      │
      ▼
3. Multi-Agent Audit: Diff check + Security audit (`guardian.ps1 -Audit`, `guardian.ps1 -DiffCheck`)
      │
      ▼
4. Decision Gate: Zero regressions -> Deliver | Regressions found -> Auto-Remediate
```

---

## Quick CLI Usage

### Native Windows PowerShell:
```powershell
# Run security and anti-pattern audit
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -Audit .

# Inspect git diff for regressions
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck

# Compare invariants before and after an edit
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants file.js -OutFile before.json
# ... make edit ...
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants file.js -OutFile after.json
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json
```
