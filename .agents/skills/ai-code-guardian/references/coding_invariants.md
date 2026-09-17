# Pillar 4: Coding Invariants & Regression Shield
## Preserving Existing Functionality, Contracts, and Zero-Context-Rot Engineering

The most damaging behavior of AI coding assistants is **silent regression**: when asked to modify or add feature $B$, the AI unintentionally deletes, truncates, or corrupts feature $A$ which was previously working.

This reference manual defines the invariant framework that guarantees zero loss of functionality.

---

## 1. The Concept of Code Invariants

An **invariant** is a condition, symbol, contract, or behavior that MUST remain true before, during, and after any code modification.

In frontend and web software engineering, critical invariants include:
1. **DOM ID Invariant**: Every `id="..."` present in an existing HTML document must not be removed or renamed unless explicitly requested by the user, because JavaScript event listeners and CSS selectors depend on it.
2. **Event Listener Invariant**: Event listeners bound to buttons, inputs, or forms must continue to fire and receive their expected event payloads.
3. **Function Signature & Export Invariant**: Function names, argument order, and returned data structures must not change in a way that breaks existing consumers.
4. **State Schema Invariant**: Database document fields, localStorage keys, and state objects must retain backward compatibility with previously stored data.

---

## 2. Eliminating the 4 Destructive AI Coding Habits

### 2.1 Destructive Habit 1: Lazy Truncation Comments
*   **The Sin**:
    ```javascript
    function calculateRoute(origin, destination) {
        // ... rest of the calculation logic stays the same ...
        updateUI();
    }
    ```
    If written to the file, 150 lines of complex routing logic are permanently lost!
*   **The Inviolable Rule**: **Zero Lazy Comments**. Never write placeholder comments representing omitted code. Every edit must contain complete, functional code.

### 2.2 Destructive Habit 2: Monolithic File Rewrites
*   **The Sin**: Using `write_to_file` to rewrite an entire 800-line file just to change a 3-line function. The AI's context window will inevitably drop subtle edge cases, helper functions, or comments.
*   **The Inviolable Rule**: **Surgical Atomic Edits**. Always use `replace_file_content` targeting the specific lines to change. If multiple distant blocks need changes, use `multi_replace_file_content`.

### 2.3 Destructive Habit 3: Phantom & Fake Fixes
*   **The Sin**: When an error or unhandled exception occurs, the AI "fixes" it by wrapping the code in an empty `try/catch` block or removing the failing assertion:
    ```javascript
    // FAKE FIX: Hides the bug instead of solving it
    try {
        processPayment();
    } catch(e) {
        // Ignore error
    }
    ```
*   **The Inviolable Rule**: Fix the root cause, never suppress errors silently. Errors must be logged with actionable context and handled gracefully in the UI.

### 2.4 Destructive Habit 4: Deleting Existing Edge-Case Logic
*   **The Sin**: Replacing a 40-line function that handles offline status, timeout retry, and validation with a 5-line naive `fetch()`.
*   **The Inviolable Rule**: Read the entire existing function first. Understand all branch conditions (`if (!online)`, `if (retryCount > 3)`). Every existing branch condition must be preserved or enhanced in the modified version.

---

## 3. The Invariant Verification Protocol

Before modifying any file:
1. **Snapshot**:
   Run `guardian.ps1 -ExtractInvariants <file> -OutFile before.json`
   This captures all existing symbols, functions, and DOM IDs.
2. **Apply Edit**:
   Perform surgical modification using `replace_file_content`.
3. **Re-Snapshot & Compare**:
   Run `guardian.ps1 -ExtractInvariants <file> -OutFile after.json`
   Run `guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json`
4. **Verification Outcome**:
   - If missing symbols or DOM IDs are flagged: **REVERT IMMEDIATELY** and re-implement preserving the missing elements.
   - If 0 regressions: Proceed to testing.

---

## 4. Coding Invariants Checklist

- [ ] Existing function signatures remain intact.
- [ ] No existing DOM IDs or classes were accidentally removed.
- [ ] No lazy truncation comments (`// ... rest`) exist in the file or diff.
- [ ] Edge cases and error handling branches from the original code are preserved.
- [ ] Invariant comparison (`guardian.ps1 -VerifyInvariants`) outputs: `ZERO REGRESSIONS`.
