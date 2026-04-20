# Design Brief

## Purpose & Context
Premium desktop image editor for professional visual creators. Workspace demands precision, clarity, and visual authority. Tool-centric interface with zero decorative distraction.

## Tone & Aesthetic
Utilitarian brutalism — functional clarity through high contrast and strict discipline. No gradients, no soft shadows, no visual noise. Every pixel serves purpose.

## Color Palette (Dark Mode Only)

| Token | OKLCH | Hex | Use |
| --- | --- | --- | --- |
| **Background** | `0.176 0 0` | `#2b2b2b` | Main workspace, menu bar |
| **Card** | `0.235 0 0` | `#3d3d3d` | Panels, toolbars, elevated surfaces |
| **Border** | `0.333 0 0` | `#555555` | Dividers, subtle separation |
| **Foreground** | `0.975 0 0` | `#f7f7f7` | Primary text, high contrast |
| **Muted-Fg** | `0.753 0 0` | `#bfbfbf` | Secondary text, labels |
| **Accent** | `0.65 0.2 200` | Cyan `#2db8ff` | Active tools, highlights, focus |
| **Destructive** | `0.6 0.25 25` | Red `#e74c3c` | Delete, destructive actions |

## Typography

| Role | Font | Weight | Size | Use |
| --- | --- | --- | --- | --- |
| **Display** | Geist Mono | 400 | 12px–14px | Menu labels, tool names (monospace authority) |
| **Body** | DM Sans | 400 | 11px–12px | Panel text, buttons, inputs (clean modern) |
| **Mono** | JetBrains Mono | 400 | 10px–11px | Coordinates, measurements, code-like precision |

## Structural Zones

| Zone | Background | Foreground | Border | Height/Notes |
| --- | --- | --- | --- | --- |
| **Top Menu Bar** | `#2b2b2b` | `#f7f7f7` | `#555555 bottom` | 40px, File/Edit/Image/Layer/Filter/View/Window/Help |
| **Left Toolbar** | `#3d3d3d` | `#f7f7f7` | `#555555 right` | 120px wide, 2×5 grid of tool icons, 8px gaps |
| **Center Canvas** | `#1a1a1a` | N/A | `#555555 all` | Fabric.js rendering area, maximum contrast draw |
| **Right Panels** | `#3d3d3d` | `#f7f7f7` | `#555555 left` | 280px wide, stacked: Color Picker → Properties → Layers |
| **Status Bar** | `#2b2b2b` | `#bfbfbf` | `#555555 top` | 24px, optional zoom %, coordinates |

## Shape Language
- **Border Radius:** `2px` max (Photoshop standard, near-square corners)
- **Spacing:** 4px base unit (compact desktop software density)
- **Shadows:** None (hard edges) or `0 1px 3px rgba(0,0,0,0.3)` subtle depth only
- **Button Style:** Flat, no gradients; hover adds `+0.5L` lightness to card bg
- **Focus Ring:** `2px solid oklch(var(--accent))` (cyan, sharp)

## Component Patterns

| Component | Style Notes |
| --- | --- |
| **Toolbar Button** | `ps-toolbar-btn` — 32px square, icon + label, hover bg-muted |
| **Panel Header** | `ps-panel-header` — semibold, border-bottom divider |
| **Slider Input** | Range: 0–100, thin track, filled bar in accent cyan |
| **Color Picker** | RGB sliders + hex input + gradient preview, compact layout |
| **Layer Thumbnail** | 64px square, border `1px border-border`, hover highlight accent |
| **Menu Item** | 12px monospace, left-padded, no subtext, click → action |

## Elevation & Depth
No shadowing; separation via color contrast and thin borders only. Canvas area (#1a1a1a) recedes; panels (#3d3d3d) advance. Border placement creates visual hierarchy.

## Spacing & Rhythm
- **Panel margins:** 4px
- **Button gaps:** 4px
- **Panel section gaps:** 8px
- **Text baseline:** 11px (DM Sans body), 10px (JetBrains Mono labels)
- Compact density mirrors professional desktop UI (Photoshop, Final Cut Pro)

## Motion & Interaction
- **Transition:** `0.2s cubic-bezier(0.4, 0, 0.2, 1)` (sharp, snappy)
- **Hover:** Background lightness +0.5L, no color shift
- **Active/Selected:** Accent cyan highlight, `2px` left border or full bg fill
- **Disable:** Opacity 50%, cursor not-allowed

## Signature Detail
**Hard-edged canvas isolation:** The `#1a1a1a` canvas area sits surrounded by `#3d3d3d` and `#555555` borders, creating a recessed "window" effect. This mirrors Photoshop's canvas pit and anchors the user's visual attention.

## Constraints & Guardrails
- No gradients, no soft colors, no decorative blur
- Monospace fonts only for UI labels (technical authority)
- All dividers are thin `#555555` lines, never thick strokes
- Accent cyan used sparingly: active tool, hover states, focus rings only
- Text contrast ratio min 7:1 on all backgrounds (AA+++)
- No rounded corners beyond `2px`

