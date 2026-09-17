# Pillar 1: Design & UI/UX Standards
## Preventing CSS Clobbering, Specificity Wars, and Responsive Fragility

AI models frequently fail at UI engineering due to lack of visual awareness and context blindness. This manual provides strict, non-negotiable rules for all styling and interface modifications.

---

## 1. CSS Clobbering & Cascade Safety

### The Problem
When asked to change a button or add a card, AI often writes:
```css
/* ANTI-PATTERN: Brute-force override */
.btn {
    background: #ff0055 !important;
    padding: 10px 20px !important;
}
```
This causes:
- Cascading overrides that break other screens using `.btn`.
- Inability to theme or adapt in dark mode.
- Specificity wars where subsequent edits require increasingly convoluted selectors.

### The Guard Rules
1. **Zero `!important` Rule**: Never introduce `!important` into styles unless overriding a third-party stylesheet that cannot be modified.
2. **Honor Design Tokens**: Always reuse existing CSS Custom Properties (`var(--primary)`, `var(--bg-card)`, `var(--radius-md)`, etc.).
   ```css
   /* COMPLIANT: Respects design system */
   .incident-action-btn {
       background: var(--color-danger, #ef4444);
       border-radius: var(--radius-sm, 6px);
       color: var(--color-white, #ffffff);
   }
   ```
3. **Scoped BEM or Prefixed Classes**: Never style bare tags (like `button { ... }` or `p { ... }`) in component stylesheets. Use descriptive, scoped class names (e.g., `.panic-btn`, `.route-card__header`).

---

## 2. Responsive Design & Fluid Intrinsic Layouts

### The Problem: The "Prettiness Trap"
AI generates static desktop layouts with hardcoded dimensions (`width: 480px; height: 320px;`) that look fine on a 1080p monitor but:
- Truncate text or cause horizontal scroll on mobile viewports (< 400px).
- Break when user zooms to 200% (violating WCAG 1.4.4 Resize Text).
- Overlap floating UI elements over essential interaction buttons.

### The Guard Rules
1. **Fluid Primitives First**:
   - Use `clamp()` for responsive font sizes, paddings, and widths:
     ```css
     font-size: clamp(1rem, 2.5vw, 1.5rem);
     padding: clamp(0.75rem, 2vw, 1.25rem);
     ```
   - Use `minmax()` and `auto-fit` / `auto-fill` for responsive grids:
     ```css
     grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
     ```
2. **Max-Width & Min-Height Constraints**:
   - Replace fixed `width: 400px` with `width: 100%; max-width: 400px;`.
   - Replace fixed `height: 300px` with `min-height: 300px; height: auto;` to prevent text overflow.
3. **Container Queries Over Fragile Media Queries**:
   When designing reusable cards or widgets, use `@container` so the component adapts to its parent container rather than the entire browser window.
4. **Logical Properties**:
   Prefer logical properties (`padding-inline`, `margin-block-start`, `inset-inline-end`) over physical directions (`padding-left`, `margin-top`) for multi-language and RTL support.

---

## 3. Preservation of Interactive & Accessibility States

### The Problem
AI often replaces interactive elements with plain `<div>`s or drops focus states, keyboard navigation, and ARIA labels.

### The Guard Rules
1. **Semantic HTML Elements**:
   - Always use `<button>` for actions, never `<div onclick="...">`.
   - Always use `<dialog>` or proper ARIA modal roles for dialogs.
   - Always use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`.
2. **Keyboard Accessibility**:
   - Every clickable element must be reachable via `Tab` and activatable via `Enter` or `Space`.
   - Never set `outline: none` without providing an explicit, high-contrast `:focus-visible` ring.
3. **Color Contrast (WCAG AA)**:
   - Text must meet a minimum contrast ratio of 4.5:1 against its background (3:1 for large text).
   - Never use low-contrast grey text (`#999999`) on white or dark grey on black.

---

## 4. Design Verification Checklist

Before presenting UI code:
- [ ] No `!important` was introduced.
- [ ] Uses existing CSS custom properties for colors, radiuses, and fonts.
- [ ] Tested or validated against 320px mobile viewport (no horizontal overflow).
- [ ] Dynamic text wrapping supported (no overflow hidden on essential text).
- [ ] Interactive states (`:hover`, `:active`, `:focus-visible`) are defined.
- [ ] Contrast meets WCAG AA standards.
