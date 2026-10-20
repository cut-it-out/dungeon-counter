# Dungeon Counter — Assumed Brand Palette

> **Fictional brand concept.** These are assumed visual guidelines for *Dungeon Counter*, a five-minute fantasy shop-management prototype for the fictional studio **Pocket Lantern Games**. They are not client-provided or approved guidelines.

## Brand direction

**Personality:** Cozy fantasy, resourceful, slightly mysterious, friendly and readable — more *adventurer's supply shop* than grim dungeon crawler.

**Inspiration:** Warm lantern light against dark stone, old parchment receipts, green potion bottles and copper shop fittings.

## Colors

| Color | Hex | Role | Suggested uses |
| --- | --- | --- | --- |
| **Dungeon Ink** | `#222836` | Primary dark | Game background, HUD panels, borders, main text on light surfaces |
| **Lantern Gold** | `#E8B85B` | Primary accent | Coin counter, primary buttons, progress milestones, reward flashes |
| **Potion Jade** | `#39A68D` | Gameplay accent | Potion stock, restock feedback, positive state indicators |
| **Aged Parchment** | `#F3E6C9` | Light surface | Shop cards, labels, popups, readable text on dark backgrounds |
| **Ember Copper** | `#B85C42` | Secondary accent | Upgrade details, shop trim, decorative highlights (not small text) |

### Palette at a glance

- **Environment:** Dungeon Ink + muted wood/stone CC0 sprites.
- **Economy:** Lantern Gold = coins; Potion Jade = stock/restocking.
- **UI:** Aged Parchment = readable cards/text; Ember Copper = restrained ornamental accent.
- **Visual priority:** The coin total, stock count, and two main actions should be recognizable immediately on a portrait phone screen.

## Typography

- **UI, counters, buttons:** A clean system sans-serif, such as `system-ui`, for legibility and fast loading.
- **Optional heading treatment:** A restrained serif such as Georgia Bold for the title only; avoid ornate type for numerical information.
- **Numbers:** Use tabular numerals where possible so changing gold/stock counts don't shift the UI.

## Applying the palette in *Dungeon Counter*

- **Shop background:** Dungeon Ink with a subtle warm vignette; don't let detailed sprites compete with the economy HUD.
- **Coins / primary action:** Lantern Gold, paired with dark Ink text on buttons.
- **Potions / restock:** Potion Jade for item icons and actionable restock feedback, paired with dark Ink text when used as a button fill.
- **Panels / summary screen:** Aged Parchment with Dungeon Ink text.
- **Upgrade emphasis:** Ember Copper on borders, icons, and decorative progress elements, not as the sole way to convey state.
- **Saved / loaded state:** A simple icon or short label in addition to a color cue.

## Readability and accessibility

- **Dungeon Ink on Aged Parchment:** approximately **11.9:1** contrast.
- **Dungeon Ink on Lantern Gold:** approximately **8.0:1** contrast.
- **Dungeon Ink on Potion Jade:** approximately **4.9:1** contrast.
- Don't use small Parchment text on Jade or Copper; contrast is insufficient for ordinary-size text.
- Pair color with an icon, number or label for status changes; keep touch targets large enough for mobile use.
