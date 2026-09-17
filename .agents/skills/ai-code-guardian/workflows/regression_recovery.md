# Operational Workflow: Regression Recovery
## Diagnosing, Reverting, and Self-Correcting Detected Regressions

When a test fails, `guardian.ps1` flags missing symbols, or git diff reveals accidental deletions, execute this recovery workflow immediately.

---

## 1. Classification of Regression Severity

| Severity Level | Indicator | Immediate Action |
|---|---|---|
| **P0: Functional Breakage** | Missing previously functional DOM ID, dropped API method, or broken build | **Full rollback** of the affected hunk or file. |
| **P1: Security Violation** | Exposed secret, unescaped `innerHTML`, or hardcoded credential | **Immediate sanitization**; never commit secret to history. |
| **P2: Design Clobbering** | Introduced `!important`, broken responsive layout on mobile, or clobbered styles | **Remove override**; refactor using design tokens and fluid CSS. |
| **P3: Code Churn / Duplication** | Re-implemented helper that already existed in utils | **Delete duplicate**; import and invoke existing helper. |

---

## 2. Step-by-Step Rollback & Recovery Procedure

### Step 1: Isolate the Destructive Hunk
Run:
```powershell
git diff --unified=3 <TargetFile>
```
Identify the exact lines that deleted existing code.

### Step 2: Reinstate Preserved Elements
If a function or DOM ID was removed:
1. Copy the original element from the `before` state or `git diff`.
2. Re-insert it into the file.
3. If the user requested an update to that element, modify its internal logic while preserving its identifier, event listeners, and caller contracts.

### Step 3: Fast Rollback via Git (If Corrupted Beyond Repair)
If the modification introduced widespread cascading corruption:
```powershell
git checkout -- <TargetFile>
```
Confirm the file is restored to its clean, working commit state, then plan a more surgical, smaller-scope edit.

### Step 4: Re-Verification Loop
Never assume a fix worked without re-running the verification pipeline:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -Audit <TargetFile>
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck
```
Only proceed once all checks pass with zero errors.
