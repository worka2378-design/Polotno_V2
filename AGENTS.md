# Project Design Guidelines & Styling Rules

## 1. Fully Rounded Controls & Inputs
- All text input fields (`<input>`), action buttons (`<button>`), badge pills, and list item containers across modals, menus, and side panels MUST be fully rounded (`rounded-full`).
- Inputs and action triggers in modals (such as AuthModal, ExportModal, LayersPanel) must use `rounded-full` instead of rectangle or low-radius corners.

## 2. No Background Hover Overlays on Menu Items & Action Options
- Do NOT add tinted background block overlays on hover (e.g. avoid `hover:bg-white/10`, `hover:bg-white/5`, `hover:bg-rose-500/20`) for list items, option buttons, dropdown choices, or context menu items.
- On hover, highlight the text label and icon color directly (e.g. `text-zinc-400 -> text-white` or `group-hover:text-white`).

## 3. Monochromatic System Palette Only
- Strictly maintain a monochrome dark/light system aesthetic using neutral zinc/gray tones (`text-zinc-300`, `text-zinc-400`, `text-white`, `border-white/10`, `bg-zinc-900/95`).
- Do NOT introduce decorative accent colors or badges (e.g., no amber, rose, emerald, or cyan text, borders, or badges in modals, status badges, or option buttons).
- Keep all system UI components aligned with the sleek minimalist floating glass toolbar aesthetic.

## 4. Uniform Icon Sizing
- All icons across main menus, modals, toolbars, layer settings, and option buttons MUST be uniformly sized to `w-4 h-4` (16px x 16px).
