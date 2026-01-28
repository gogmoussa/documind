# DocuMind Design System

## 1. Design Direction Summary
*   **Aesthetic Name:** Industrial Utilitarian (Blue-Glow Variant)
*   **DFII Score:** 15
*   **Inspiration:** Schematic blueprints, NASA mission control monitors, and high-performance developer tools (Linear/Warp).

## 2. Design System Snapshot

### Typography
*   **Display Font:** "Space Grotesk" or similar (Geometric, technical, wide caps). Rationale: Evokes a "lab" or "engine" feel.
*   **Body Font:** "JetBrains Mono" or "Geist Mono". Rationale: Familiarity for developers; emphasizes the "code-first" nature.

### Color Palette (CSS Variables)
```css
:root {
  --bg-primary: #0a0a0c;       /* Deep obsidian */
  --bg-secondary: #141416;     /* Dark charcoal */
  --accent-primary: #00f2ff;   /* Electric Cyan (The "Glow") */
  --accent-secondary: #0066cc; /* Deep Blue (The "Shadow") */
  --text-primary: #f0f0f2;
  --text-secondary: #94949e;
  --border-subtle: #242426;
  --status-error: #ff3366;     /* For circular dependencies */
  --status-success: #00ff99;
}
```

### Spacing & Rhythm
*   **Grid:** 4px baseline. Strictly aligned.
*   **Borders:** 1px solid with subtle 2px rounding. No heavy radiuses—keep it "Industrial".

### Motion Philosophy
*   **Entrance:** Staggered "blueprint" reveal (nodes appearing with a faint grid reveal).
*   **Interaction:** "Magnetic" hover effects on graph nodes.
*   **Transitions:** Fast, crisp slides (200ms) for the Inspector panel.

## 3. Differentiation Callout
> “This avoids generic UI by doing X instead of Y.”
