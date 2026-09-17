# Real-World Example: Non-Destructive Update Walkthrough
## How AI Code Guardian Protects a Live Citizen Safety Web App

This practical example illustrates how `ai-code-guardian` prevents common catastrophic regressions during a realistic user update request.

---

## The Scenario

A user requests an update to `index.html`:
> *"Agrega un botón de 'Llamar al 911' justo al lado del botón de pánico principal con un estilo rojo vibrante y una confirmación rápida."*

---

## Bad AI Behavior (Without AI Code Guardian) ❌

An unguided AI assistant frequently produces the following regressions:
1. **Destructive Rewrite**: Overwrites `index.html` completely using `write_to_file`. In doing so, it drops the `#nav-btn-routes` ID, the modal container `#broadcast-alert-modal`, or the GPS pill `#gps-status-pill`.
2. **CSS Clobbering**: Inserts an inline `<style>` block with `.btn { background: red !important; }`, breaking all buttons across all tabs.
3. **Dropped Listeners**: Replaces `#main-panic-btn` with a new `<button id="panic">`, causing `js/app.js` to throw `TypeError: Cannot read property 'addEventListener' of null`.
4. **Lazy Comments**: Inserts `<!-- ... rest of sections ... -->`, erasing 400 lines of HTML.

---

## Safe AI Behavior (With AI Code Guardian) ✅

Following the 4-Phase Protocol of `ai-code-guardian`:

### Phase 1: Pre-Change Invariant Snapshot
1. Run snapshot extraction:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants index.html -OutFile before.json
   ```
2. Invariants identified:
   - `#main-panic-btn` must be preserved.
   - `#panic-countdown-overlay` must be preserved.
   - All 99 DOM IDs in `index.html` must remain intact.

### Phase 2: Surgical Non-Destructive Edit
Using `replace_file_content` targeting strictly the panic button container:

```diff
  <div class="panic-actions-cluster">
      <button id="main-panic-btn" class="panic-btn" aria-label="Activar Alerta de Pánico">
          <span class="panic-btn-icon">🚨</span>
          <span class="panic-btn-text">PÁNICO</span>
      </button>
+     <a id="btn-call-911" href="tel:911" class="btn-emergency-call" aria-label="Llamar al 911 Directo">
+         <span class="emergency-icon">📞</span>
+         <span class="emergency-text">911</span>
+     </a>
  </div>
```

Key principles respected:
- `#main-panic-btn` was untouched.
- No `!important` styling.
- Used semantic `<a>` with `href="tel:911"` instead of an unverified JavaScript `eval` or broken trigger.

### Phase 3: Post-Change Verification
1. Extract new invariants:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -ExtractInvariants index.html -OutFile after.json
   ```
2. Compare invariants:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -VerifyInvariantsBefore before.json -VerifyInvariantsAfter after.json
   ```
   **Result**:
   ```
   [OK] ZERO REGRESSIONS: All existing symbols and DOM IDs are fully preserved.
   ```
3. Check git diff:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .agents/skills/ai-code-guardian/scripts/guardian.ps1 -DiffCheck
   ```
   **Result**:
   ```
   [OK] Git diff inspection passed cleanly. No suspicious deletions or lazy patterns found.
   ```

### Phase 4: Delivery Gate
The change is presented to the user with full confidence that nothing was broken!
