# Design System Specification: Editorial Precision Editor

## 1. Overview & Creative North Star
### The North Star: "The Brutalist Precisionist"
This design system is built for high-performance creative environments where clarity is paramount. It rejects the "default" web look of soft shadows and rounded fluff in favor of **Organic Brutalism**. The aesthetic is defined by architectural rigidity, intentional flat surfaces, and a high-contrast editorial hierarchy.

We break the standard "template" feel by utilizing hyper-compact typography scales and a "no-line" philosophy. Content is not contained by borders; it is defined by its own density and the deliberate tonal shift of the surfaces it sits upon. This is an editor for power users who value density, speed, and visual honesty.

---

## 2. Colors
The palette is a deeply saturated midnight sequence, optimized for long-session eye comfort and maximum focus on the viewport content.

### Surface Hierarchy & Nesting
Instead of using 1px borders to separate panels, we use the **Surface Tiering** method. This creates "nested" depth through value shifts:
*   **Background (`#0c1322`):** The foundation. Used for the primary viewport or the deepest level of the application.
*   **Surface Low (`#141b2b`):** Primary sidebars and navigation backgrounds.
*   **Surface High (`#232a3a`):** Floating inspector panels and active "top-layer" cards.
*   **Surface Highest (`#2e3545`):** Hover states and active selections within lists.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning UI components. Boundaries must be defined solely through background color shifts. For example, a property field should not have an outline; it should be a `surface-container-high` block sitting on a `surface-container-low` panel.

### Glass & Texture
While the core style is flat, "Floating" utility panels (like temporary HUDs) should utilize a **Glassmorphism** effect: `surface-variant` at 60% opacity with a `20px` backdrop-blur. This allows the editor's grid and scene to bleed through, maintaining a sense of spatial awareness.

---

## 3. Typography
The typography is driven by **Inter**, chosen for its mathematical precision and exceptional legibility at small scales.

*   **Display/Headline:** Rarely used in the core editor, reserved for splash screens. Use `headline-sm` (1.5rem) for major mode titles.
*   **Section Headers:** The hallmark of the system. **10px / All Caps / 0.1rem Letter Spacing.** Use `text-muted` (`#9ca3af`). This provides an editorial, architectural feel that stays out of the way of the data.
*   **Body (Primary):** `body-md` (0.875rem) in `text-primary` (`#f9fafb`).
*   **Labels/Monospace:** All numeric values in inputs use a tabular-lining version of Inter to ensure "X Y Z" coordinates never shift layout when values change.

---

## 4. Elevation & Depth
In this design system, "Up" does not mean "Shadow." It means "Lighter."

*   **The Layering Principle:** Depth is achieved by stacking the surface-container tiers. A floating card is simply a `surface-container-highest` block.
*   **The Ghost Border:** If accessibility requirements demand a container boundary, use a **Ghost Border**: `outline-variant` at 15% opacity. It should feel like a suggestion of an edge, not a hard line.
*   **Ambient Shadows:** For floating collapsible cards only, use a tinted ambient shadow: `0 20px 40px rgba(0, 0, 0, 0.4)`. No sharp edges; the shadow must feel like a soft atmospheric occlusion.

---

## 5. Components

### Pill Segmented Controls
Used for mode switching (e.g., 2D / 3D / 2D+3D).
*   **Container:** `surface-container-low`, `rounded-full`.
*   **Active State:** `accent-blue` (`#3b82f6`) background with `on-primary` text. No shadow.
*   **Padding:** `spacing-1.5` (0.3rem) vertical, `spacing-4` (0.9rem) horizontal.

### Horizontal Range Sliders
*   **Track:** `surface-container-highest` (2px height).
*   **Thumb:** `accent-blue`, 12px square (no rounding).
*   **Numeric Badge:** A `label-sm` badge floating at the end of the track, using `surface-container-highest` background to indicate current value.

### Compact Inline Number Inputs (X Y Z)
*   Styled as a single contiguous row. Labels (X, Y, Z) are colored (Red, Green, Blue) at 10px bold.
*   The input background is a single `surface-container-lowest` strip. Values are separated by the "No-Line" rule (white space only).

### Collapsible Floating Cards
*   **Header:** `surface-container-high`.
*   **Content:** `surface-container-low`.
*   **Interaction:** A 45-degree chevron that rotates 90 degrees on toggle. No borders. Use `spacing-4` (0.9rem) to separate the card from the viewport edge.

### Toolbars: Pill Icon Buttons
*   **Shape:** `rounded-full` (Pill).
*   **State:** Flat background. On hover, shift from `surface` to `surface-bright`. On active, use `accent-blue`.
*   **Iconography:** High-stroke (2pt) icons for clarity against the dark backgrounds.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace (`spacing-8` or `1.75rem`) as a structural separator instead of lines.
*   **DO** align all numeric data to the right in lists to maintain vertical "scan-lines."
*   **DO** use the `accent-blue` sparingly. It is a "laser pointer," not a decorative element.
*   **DO** use `surface-container-lowest` for deep "wells" like code editors or terminal outputs.

### Don't
*   **DON'T** use 1px borders between sidebar items. Use a background hover state (`#2e3545`) instead.
*   **DON'T** use standard "Material Design" rounded corners (4px). Use the defined `sm` (0.5rem) or `full` (pill) for a more custom, editorial feel.
*   **DON'T** add gradients to buttons. The system's power comes from its flat, matte aesthetic.
*   **DON'T** use "Drop Shadows" on standard UI panels. Let the tonal shifts handle the hierarchy.