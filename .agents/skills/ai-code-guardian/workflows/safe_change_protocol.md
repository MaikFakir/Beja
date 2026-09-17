# Operational Workflow: Safe Change Protocol
## Step-by-Step Procedure for Modifying Code Without Breaking Existing Functionality

Follow this 4-phase protocol on **every single user request** that involves modifying existing source files.

---

## Phase 1: Pre-Change Impact & Invariant Formulation

Do not write or edit any code yet.

1. **Inspect Target Files**:
   - Use `view_file` to thoroughly read the lines surrounding the intended change, plus any caller or consumer files.
   - Run `grep_search` to find all references to functions, variables, or DOM IDs you plan to touch.
2. **Snapshot Invariants**:
   - Run the invariant extractor:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants <TargetFile> -OutFile before.json
     ```
3. **Formulate Invariant List**:
   Explicitly declare in your internal reasoning:
   - "Functions that must remain callable: `[func1, func2]`"
   - "DOM IDs that must remain intact: `[id1, id2]`"
   - "Existing edge cases that must be preserved: `[offline check, retry logic]`"

---

## Phase 2: Surgical Non-Destructive Edit

1. **Use Minimal Contiguous Replacements**:
   - Use `replace_file_content` targeting ONLY the exact lines being updated.
   - Do NOT overwrite the entire file using `write_to_file`.
   - If changes span multiple non-adjacent blocks, use `multi_replace_file_content`.
2. **Reuse Existing Utilities**:
   - If the new feature needs a formatting or calculation utility, import and call existing helpers rather than writing a duplicate copy.
3. **Zero Lazy Comments**:
   - Verify every replacement chunk is 100% syntactically complete. Never use `// ... rest of code`.

---

## Phase 3: Multi-Agent Audit & Automated Verification

Immediately after applying the edit:

1. **Run Static Security & Anti-Pattern Audit**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -Audit <TargetFile>
   ```
   Verify 0 Critical and 0 High severity findings.
2. **Run Git Diff Integrity Check**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck
   ```
   Ensure no lazy comments and no unexpected function/listener deletions appear in the diff.
3. **Run Invariant Comparison**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants <TargetFile> -OutFile after.json
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json
   ```
   Confirm output: `[OK] ZERO REGRESSIONS`.

---

## Phase 4: Decision & Delivery Gate

### Case A: All Checks Passed (Zero Regressions)
- Clean up temporary snapshot files (`before.json`, `after.json`).
- Proceed to build, test execution, or browser verification.
- Deliver results to the user with an exact breakdown of what was added and how existing functionality was preserved.

### Case B: Regressions or Violations Detected
- **HALT**: Do NOT present broken code to the user.
- Consult `workflows/regression_recovery.md`.
- Reinstate deleted symbols/IDs immediately.
- Re-run Phase 3 until clean.
