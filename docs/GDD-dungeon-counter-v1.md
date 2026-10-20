# Dungeon Counter — Game Design Document

*Draft for review · Session 2 · 20 October 2026*

> **Fictional client exercise.** Pocket Lantern Games and Nico are invented (see `docs/BRIEF_dungeon-counter-idle-sim.md`). The visual direction follows the assumed brand guide in `docs/dungeon-counter-brand-palette.md`.

## 1. Overview

**Pitch:** You run a tiny potion stall at the mouth of a dungeon. Adventurers stop by on their way in and buy potions automatically. You decide when to restock and when to invest in better brews. After five minutes the shop closes for the day and you get your takings and a rank.

**Design pillars**

1. **Five minutes, complete.** One session has a beginning, a middle and an ending screen. There's nothing to grind after it.
2. **Readable numbers.** Every price, cost and effect is visible on screen and lives in one small config file.
3. **Honest balancing.** The economy is judged on exported play data, not on feel alone. If the starting numbers turn out fine, the write-up says so.

## 2. Player & platform

- **Player:** a casual idle/management player checking a game on their phone for about five minutes.
- **Platform:** browser, no install, no server. Hosted on Cloudflare Pages.
- **Orientation:** mobile portrait. Design resolution **390 × 844** with Phaser `Scale.FIT`, centred and letterboxed in Dungeon Ink on wider screens. It is playable on desktop with a mouse, but the phone is the target.
- **Input:** tap only. All actions sit in the bottom half of the screen (thumb zone), with touch targets at least 48 px tall.
- **Stack:** Phaser + Vite + TypeScript, with Vitest for the economy logic.

## 3. Session structure

```
Title ──► Play (5:00) ──► Summary ──► Play again
  │                          │
  └─ Continue (if a save     └─ Export CSV
     exists)
```

- **Title:** game name (Georgia Bold), **New day** button, and **Continue** if there's a saved, unfinished run.
- **Play:** the shop screen (section 7). The timer counts down from 5:00.
- **Summary:** the shop closes. It shows coins earned, potions sold, missed sales, upgrade level, final coin balance and the **rank** (Bronze / Silver / Gold, or "No rank"). Buttons: **Export CSV**, **Play again**.
- **Menu (from Play):** Export CSV, Reset run, Resume. Opening it pauses the timer.

## 4. Core mechanics

One product (potions), one shop screen, one upgrade track.

| Mechanic | Rule |
|---|---|
| **Stock** | Potions on the shelf. They can never exceed `shelfCap`. |
| **Restock** | Tap to pay `restockCost` coins and add `restockBatch` potions immediately. Disabled when coins < `restockCost` or when `stock + restockBatch > shelfCap`. |
| **Customers** | One adventurer arrives exactly every `customerInterval` seconds of game time (first at t = `customerInterval`). If stock > 0 they buy one potion at the current price. If not, they leave: a **missed sale**. No randomness, no pathfinding. |
| **Upgrade: "Better Brews"** | Tap to pay the current upgrade cost; the price per potion goes up by `upgradePriceStep`. Repeatable, no level cap. |
| **Timer** | 300 s of **game time**. It advances only while the Play screen is visible and the menu is closed. It pauses on tab hide / app switch (`visibilitychange`) and while the page is closed. There are no offline earnings. |

The economy is a **pure TypeScript module** that takes the config, the elapsed game time and player actions, and returns the new state plus events. Phaser only renders it and forwards taps. The same module drives the headless simulator, so played runs and simulated runs follow identical rules.

## 5. Economy model

### Formulas

- Price per potion at level *L*: `price(L) = salePrice + upgradePriceStep × L`
- Cost of the next upgrade from level *L*: `upgradeCost(L) = round(upgradeBaseCost × upgradeCostGrowth^L)`
- Customers in a full session: `floor(300 / customerInterval)`
- Gross margin per potion at level *L*: `price(L) − restockCost / restockBatch`

### Config schema

One JSON file per economy version, under `src/config/`:

| Key | Meaning |
|---|---|
| `id` | Version label written into every save and CSV row, e.g. `baseline-v1` |
| `sessionSeconds` | Session length (300) |
| `startCoins`, `startStock` | Opening state |
| `shelfCap` | Max potions on the shelf |
| `restockCost`, `restockBatch` | Coins paid / potions gained per restock |
| `salePrice` | Price per potion at upgrade level 0 |
| `customerInterval` | Seconds between adventurers |
| `upgradeBaseCost`, `upgradeCostGrowth`, `upgradePriceStep` | Upgrade cost curve and effect |
| `rankThresholds` | Coins earned for `bronze`, `silver`, `gold` |

### AI-proposed baseline (`baseline-v1`)

> **Provenance:** Claude Code (Opus 5.5) proposed these values in Session 2 from intuition about idle-game pacing, **before any calculation, simulation or playtest**. They are deliberately left untuned. They are the "before" in the balancing comparison and are never edited; changes go into a separate `revised-v1` file.

| Key | Value |
|---|---|
| `sessionSeconds` | 300 |
| `startCoins` | 20 |
| `startStock` | 5 |
| `shelfCap` | 20 |
| `restockCost` | 10 |
| `restockBatch` | 5 |
| `salePrice` | 5 |
| `customerInterval` | 3 |
| `upgradeBaseCost` | 50 |
| `upgradeCostGrowth` | 1.5 |
| `upgradePriceStep` | 2 |
| `rankThresholds` | bronze 500 · silver 1500 · gold 3000 |

### Which config runs

The public build loads the **revised** config once one exists, and `baseline-v1` until then. Adding `?config=baseline` or `?config=revised` to the URL forces a version for evidence runs. The active `id` is shown in small text in the menu.

## 6. Balancing metrics

Each metric comes from the event log, so it can be recomputed from any exported CSV.

| Nico's complaint | Metric | How it's computed |
|---|---|---|
| "sometimes you had nothing to do" | **Time to first upgrade** | `elapsed_s` of the first `upgrade` event |
| | **Idle gaps** | Stretches where no action is available (restock disabled *and* upgrade unaffordable); report total and longest |
| | **Upgrade spacing** | Seconds between consecutive `upgrade` events |
| "then suddenly money came too easily" | **Late-run coin slope** | Coins earned per minute in minute 5 vs minute 2 |
| | **Unspent surplus** | Coin balance minus next upgrade cost, sampled over time; a growing surplus means nothing worth buying |
| Supporting | **Missed sales** | Count of `missed_sale` events (stock management pressure) |
| Supporting | **Coins earned & rank** | Total sale revenue vs `rankThresholds` |

## 7. Screen layout & art direction

### Play screen (390 × 844, portrait)

```
┌──────────────────────────────┐
│ ● 125c        ⚗ 7/20     ☰  │  HUD: coins (Gold), stock (Jade), menu
│            3:42              │  Timer, tabular numerals
├──────────────────────────────┤
│                              │
│   [shelf: potion icons]      │  Shop scene: shelf shows stock visually,
│                              │  adventurer steps up to the counter each
│   🧙 → [ counter ]   +7c     │  tick; "+7c" floats up in Gold;
│                              │  "Out of stock!" bubble on a missed sale
├──────────────────────────────┤
│ ┌──────────────────────────┐ │  Upgrade card (Parchment, Copper trim):
│ │ Better Brews  Lv 1       │ │  current price → next price
│ │ 7c → 9c per potion       │ │
│ └──────────────────────────┘ │
│ ┌────────────┐ ┌───────────┐ │  Thumb zone:
│ │ RESTOCK +5 │ │ UPGRADE   │ │  Restock = Jade fill, Ink text
│ │    10c     │ │   75c     │ │  Upgrade = Gold fill, Ink text, Copper border
│ └────────────┘ └───────────┘ │
│                     ✓ Saved  │  Save indicator: icon + label
└──────────────────────────────┘
```

### Palette roles (from the brand guide)

| Element | Colour |
|---|---|
| Background, HUD panels, text on light surfaces | Dungeon Ink `#222836` |
| Coins, Upgrade button, "+Nc" popups, rank medal | Lantern Gold `#E8B85B` |
| Stock counter, Restock button, potion feedback | Potion Jade `#39A68D` |
| Upgrade card, summary panel, readable text on dark | Aged Parchment `#F3E6C9` |
| Upgrade card trim, level pips (never the only state cue) | Ember Copper `#B85C42` |

- **Mood:** dark stone with a soft warm vignette, like lantern light. The sprites stay muted so the HUD reads first.
- **Type:** `system-ui` with tabular numerals for all numbers; Georgia Bold for the title only.
- **States:** a disabled button dims *and* shows its reason ("Shelf full", "Need 10c"), so the state isn't conveyed by colour alone.
- **Art:** a handful of CC0 sprites from the **Kenney Roguelike/RPG Pack** (stone floor/wall tiles, counter, potions, one or two adventurers) and optionally the **Kenney UI Pack** (panel/button frames). The exact files are chosen during the build and recorded in `CREDITS.md`. No AI-generated art.
- **Audio:** none in scope.

## 8. Save & resume

- **Storage:** one `localStorage` key, `dungeon-counter-save`, holding JSON: `{ version, configId, coins, stock, upgradeLevel, elapsedSeconds, nextCustomerAt, finished, events[] }`.
- **When saved:** after every economy event, on `visibilitychange` → hidden, and on `pagehide`.
- **Resume:** the Title shows **Continue**. The clock carries on from `elapsedSeconds`, because time spent closed doesn't count.
- **Config mismatch:** if the saved `configId` differs from the active config, the save is discarded, with a short notice.
- **Reset:** Menu → Reset run (with a confirmation) clears the save and the event log.
- **Indicator:** a "✓ Saved" or "Loaded" label with an icon, bottom-right.
- All of this works without storage (e.g. private mode). It just won't resume.

## 9. Event log & CSV export

Every economy event is appended to the in-memory log, which is saved with the run.

| Column | Example | Notes |
|---|---|---|
| `elapsed_s` | `42.0` | Game seconds since the run began |
| `event` | `sale` | `session_start`, `restock`, `sale`, `missed_sale`, `upgrade`, `resume`, `session_end` |
| `coins` | `135` | Balance **after** the event |
| `stock` | `6` | Stock after the event |
| `upgrade_level` | `1` | Level after the event |
| `price` | `7` | Price per potion after the event |
| `amount` | `7` | Coins in (+) or out (−) for this event, 0 if none |
| `config_id` | `baseline-v1` | Economy version |

- **Export CSV** (menu and summary) downloads `dungeon-counter_<config_id>_<YYYYMMDD-HHMM>.csv` via a Blob link. Nothing leaves the device otherwise.
- There are no player IDs, device data or timestamps beyond the file name, and no remote analytics.
- Every visible change to coins or stock has a matching CSV row, so the export can be checked against what the player saw.

## 10. Balancing method

1. **Lock the baseline.** Commit `baseline-v1` before any play.
2. **Play the baseline** at least **2 full runs** and export the CSVs to `balancing/runs/`.
3. **Simulate (labelled supplement).** A headless script runs the same economy module with a fixed, simple strategy: restock whenever possible, buy an upgrade whenever it leaves enough for one restock. It writes the same CSV format, tagged as simulated. Its job is to give repeatable curves and sanity-check a change; it never replaces played runs.
4. **Diagnose.** Compute the section 6 metrics with **one SQL aggregation query** over the CSVs (the SQL engine is picked in the execution plan).
5. **Revise.** Change as little as needed in `revised-v1`, with one headline change explained and justified by a measured metric.
6. **Play the revision** for at least 2 runs, export, and re-run the query.
7. **Balancing sheet:** one CSV/spreadsheet with the baseline vs revised parameters, time to first upgrade, coin progression per minute, the metric table and the reasoning for the one change, plus a simple before/after table or chart from real runs.
8. **Honesty rule:** if the baseline turns out fine, the write-up says so and the revision is presented as a tuning experiment, not a fix.

## 11. Scope, success criteria & disclosure

**In scope:** everything in sections 3–10.

**Nice-to-have (only after all evidence is done):** a second balancing iteration; a tiny dashboard.

**Out of scope:** a second product or shop, crafting/equipment, customer AI, offline earnings, cloud save, accounts, servers, telemetry, monetisation, audio, AI-generated art, full art production.

**Success criteria (from the brief)**

- The full five-minute loop works, and save/resume survives a browser refresh on the tested phone.
- A downloaded CSV matches the events visible in the game.
- Baseline and revised runs are captured (≥2 per version if time allows).
- The write-up shows real exported data, the balancing sheet and **one measured change**.
- All art is verified CC0 and credited in `CREDITS.md`.

**AI disclosure:** Claude Code wrote code and proposed the baseline economy (section 5). The visuals are human-made Kenney CC0 assets. The case study states both roles separately.

## 12. Open questions for review

1. **What the rank measures.** This draft ranks on **coins earned** (total sales revenue), so buying an upgrade near the end never lowers your rank. The alternative is the **final coin balance**, which is simpler to read but punishes late upgrades. Which do you want?
2. **When the shelf counts as full.** The draft disables Restock when a full batch wouldn't fit. The alternative is a partial restock that fills to the cap for a proportional cost: smoother, but less obvious. Keep it disabled?
3. **Default config for the public build.** Is it right that it switches to `revised-v1` once that exists, with the baseline reachable via `?config=baseline`?
4. **Upgrade flavour.** Is "Better Brews" fine as the name of the upgrade track?
