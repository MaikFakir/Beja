# Operational Workflow: Review Gate
## Final Acceptance Gate Before Presenting Diffs to the User

The Review Gate is the strict barrier between the AI agent's internal development process and user-facing delivery. An AI assistant must NEVER state "I have implemented your change" without first passing through this gate.

---

## 1. The 10 Inviolable Review Gate Criteria

| # | Check Item | Verification Method | Status Required |
|---|---|---|---|
| **1** | **Preservation of Existing Features** | All pre-existing functions, event listeners, and DOM IDs remain functional. | **MANDATORY PASS** |
| **2** | **Zero Lazy Truncations** | No `// ... rest of code` or similar comments exist anywhere. | **MANDATORY PASS** |
| **3** | **Zero Hardcoded Secrets** | No API keys, passwords, or tokens in source files or diffs. | **MANDATORY PASS** |
| **4** | **Syntax & Build Cleanliness** | Files parse cleanly; no unclosed tags, syntax errors, or unresolved imports. | **MANDATORY PASS** |
| **5** | **Design Token Compliance** | Uses established CSS variables; zero new `!important` declarations. | **MANDATORY PASS** |
| **6** | **Responsive Safety** | Fluid layout validated; no rigid pixel dimensions causing mobile overflow. | **MANDATORY PASS** |
| **7** | **XSS & Injection Protection** | No raw `innerHTML` with unsanitized variables; use `textContent` or sanitized nodes. | **MANDATORY PASS** |
| **8** | **DRY Reuse** | Existing shared utilities in the workspace were reused rather than duplicated. | **MANDATORY PASS** |
| **9** | **Minimal Diff Footprint** | Only lines relevant to the user request were modified (no gratuitous reformatting). | **MANDATORY PASS** |
| **10**| **Clean Verification Logs** | `guardian.ps1 -Audit` and `guardian.ps1 -DiffCheck` pass cleanly. | **MANDATORY PASS** |

---

## 2. Review Gate Execution Commands

Execute these two commands before reporting completion:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -Audit .
powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck
```

If both commands return exit code `0`, the Review Gate is PASSED.
