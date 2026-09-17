# Pillar 3: Structuring & Anti-Churn Rules
## Preventing Code Duplication, Architectural Decay, and "Frankenstein Codebases"

Empirical research from GitClear ("Coding on Copilot") analyzing millions of lines of AI-assisted code revealed two alarming patterns:
1. **Dramatic Spike in Code Churn**: Code rewritten or reverted almost immediately after delivery.
2. **Rise of Duplicated Code & Plummeting Refactoring**: AI acts like an "itinerant contributor"—someone unfamiliar with the existing codebase who author duplicate helper functions instead of reusing existing architecture.

This manual enforces strict architectural discipline.

---

## 1. The "Search Before Authoring" (DRY) Protocol

### The Problem
When asked to format a date, calculate distance, or display a notification, AI writes a brand new helper function at the top of the file, ignoring that `formatDate()`, `calculateHaversineDistance()`, or `showToast()` already exist in `js/utils.js`.
Result: 5 different implementations of distance calculation, slight bugs between them, and bloated bundle sizes.

### The Guard Rules
1. **Grepping Before Coding**:
   Before writing any utility function, the agent MUST run `grep_search` across the workspace for keywords (e.g., `formatDate`, `haversine`, `toast`, `modal`, `debounce`).
2. **Mandatory Utility Reuse**:
   If a function already exists in the project:
   - Import and reuse it.
   - Do NOT redefine or copy-paste it into the current file.
3. **Centralization of Shared Helpers**:
   If a new utility is created that is needed by more than one module, place it in a dedicated shared module (e.g., `js/utils.js`) and export it cleanly.

---

## 2. Modularity & Single Responsibility Principle (SRP)

### The Problem: Monolithic Bias
AI loves the "path of least resistance": cramming 800 lines of HTML, CSS, business logic, Firebase queries, and DOM event listeners into one single file.
Result: Untestable, fragile code where changing a button label accidentally breaks database synchronization.

### The Guard Rules
1. **Separation of Concerns**:
   - **Presentation (HTML/CSS)**: Defines structure and styling tokens.
   - **State & Data Access (Services/Store)**: Manages communication with APIs, Firestore, or LocalStorage.
   - **Controller / Interaction (UI Handlers)**: Binds DOM events to services.
2. **File Size & Complexity Budget**:
   - Keep individual modules focused (< 300-400 lines where practical).
   - If a file exceeds this threshold, identify distinct responsibilities and extract them into clean, imported submodules.

---

## 3. Anti-Frankenstein Architecture (Paradigmatic Consistency)

### The Problem
AI mixes paradigms across turns:
- Turn 1: Writes modern vanilla ES6 modules with async/await.
- Turn 2: Injects jQuery `$('#element')` or old callback spaghetti.
- Turn 3: Switches to inline DOM attributes (`onclick="handleClick()"`).

### The Guard Rules
1. **Match Existing Code Style & Idioms**:
   - If the project uses standard ES6 modules (`import`/`export`), continue using ES6 modules.
   - If event listeners are bound via `addEventListener`, never introduce inline `onclick="..."` in HTML.
   - If naming convention is `camelCase` for functions and `kebab-case` for DOM IDs/classes, adhere strictly to this standard.
2. **Preserve Public API Contracts**:
   - When updating a function in a shared module, ensure its parameters and return types remain backward-compatible with all existing callers.
   - If a signature must change, update every caller across the repository in the same atomic commit.

---

## 4. Structuring Verification Checklist

Before finalizing structural changes:
- [ ] No duplicated helper functions were created (existing utilities reused).
- [ ] Code adheres to the project's existing paradigm and architectural pattern.
- [ ] Imports are cleanly organized and no circular dependencies are introduced.
- [ ] All functions have a single, well-defined responsibility.
- [ ] Public function signatures remain backward-compatible.
