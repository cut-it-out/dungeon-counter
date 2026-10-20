# Dungeon Counter — Game Design Document (v2)

*Revised design for review · 20 October 2026 · Three-day AI-assisted portfolio prototype*

> **Fictional client exercise.** Pocket Lantern Games and Nico are fictional, not real commissioners. The project brief is `docs/BRIEF_dungeon-counter-idle-sim.md`, and the assumed visual identity is `docs/dungeon-counter-brand-palette.md`. This document is a proposed implementation spec, **not evidence that a game or playtest already exists**. Section 13 records what changed from v1 and why.

## 0. Decision snapshot and delivery priority

**Decisions for v2:** One potion product; one repeatable *Better Brews* upgrade; five-minute deterministic sessions; fixed-batch restocking; rank calculated from **gross sales revenue**, if medals are included; Phaser + Vite + TypeScript; same-device saving; local CSV export; and a small baseline-versus-revision balancing analysis. No remote telemetry and no AI-generated artwork.

**Build in ~3 focused days (18–24 hours) with AI assistance.** The minimum complete portfolio demo is **a playable five-minute session + resume + genuine CSV evidence + one documented tuning experiment**. A headless simulator, decorative medals and a dashboard are stretch work; they must not delay a working build or truthful evidence.

**Delivery priority:**

- **P0 — playable:** deterministic economy, clear restock/upgrade actions, portrait UI, five-minute ending, safe handling of an unaffordable restock.
- **P1 — portfolio evidence:** local save/resume, event CSV, one baseline and one revised run, a small SQL aggregation and balancing summary.
- **P2 — presentation:** medals (after calibration), extra sprite animation, automated headless simulation, additional comparisons/dashboard.

## 1. Overview

**Pitch:** You run a tiny potion stall at the mouth of a dungeon. Adventurers automatically buy potions when you have stock. Decide when to restock and when to buy better brews. After five minutes, the shop closes and you see what you sold, what you spent and how much money remains.

**Design pillars**

1. **Five minutes, complete:** one compact session with a clear ending, not an endless grind.
2. **Readable choices:** coins, stock, upcoming purchase costs and upgrade benefit are legible on a phone.
3. **Auditable economics:** the starting numbers, player actions and measured change can be independently checked from saved configs and CSVs.

**Player decisions:** *Can I afford to restock?* and *Is the next upgrade worth buying now?* Adventurer arrivals are automatic; there is no tapping to serve customers.

## 2. Player, platform and technology

- **Player:** casual mobile management/idle player with approximately five minutes to play.
- **Platform:** browser, HTTPS, no install or server; intended deployment on Cloudflare Pages.
- **Orientation:** mobile portrait; reference canvas **390 × 844** with Phaser `Scale.FIT`. Desktop displays a centred portrait game with Dungeon Ink bars.
- **Input:** taps or mouse clicks. Primary action buttons occupy the lower portion of the screen. Aim for **at least 56 design pixels in height**, then check their *actual* on-device size after scaling (target approximately 48 CSS px or more).
- **Stack:** Phaser, Vite, TypeScript. Vitest for a few economy invariants. Keep UI and simulation concerns separate.
- **Focus and accessibility:** visible labels as well as colours, legible tabular numbers, no audio dependency, no required animation or precise gestures. Allow pause/resume on backgrounding; account for phone safe areas in final testing.

## 3. Session flow

```text
Title ── New day ──► Play (5:00) ──► Summary ──► New day
  │                    │                  │
  ├── Continue*        └── Pause menu     └── Export CSV
  └── Last summary*       ├ Resume
                          ├ Export CSV
                          └ Reset run (confirm)
*Only when a matching save / finished run exists.
```

- **Title:** *New day*, plus *Continue* when an unfinished save exists. If a completed run is saved, offer *Last summary / Export* rather than silently discarding it.
- **Play:** the potion stall, coins, stock, five-minute timer, upgrade card and two action buttons.
- **Summary:** gross sales revenue, restock spending, upgrade spending, potions sold, missed sales, upgrade level and closing coin balance. Optional medal only after rank cut-offs are validated.
- **Pause menu:** Resume, Export CSV, Reset run (requires confirmation). The timer and customer arrivals pause while it is open.
- **New day / Play again:** warn before replacing an existing run log, whether or not an export was previously requested. Export remains available from the latest completed summary.

## 4. Core mechanics and edge cases

| Mechanic | v2 rule |
|---|---|
| **Stock** | One item: potions. Integer count in `[0, shelfCap]`. |
| **Restock** | Spend exactly `restockCost` to add exactly `restockBatch` immediately. Available only if `coins >= restockCost` **and** `stock <= shelfCap - restockBatch`. No partial purchase or proportional price. |
| **Customers** | One arrival at each scheduled game-time point: `customerInterval`, `2 × customerInterval`, etc. An arrival buys exactly one potion if available; otherwise record `missed_sale`. No randomness/pathfinding. |
| **Better Brews** | Pay `upgradeCost(level)` to increase the sale price by `upgradePriceStep`. The level has no fixed cap; the rising cost naturally constrains it within five minutes. |
| **Solvency guard** | Upgrade is disabled unless **`coins - upgradeCost(level) >= restockCost`**. This deliberately reserves enough for one future restock so an upgrade cannot drain the cash needed to trade. Display *“Keep 10c for stock”* (computed from config) when this is the blocker. |
| **Timer** | Exactly `sessionSeconds` of **active game time**. Pause on menu, tab hidden/app switch and browser closed; **no offline gains**. |

**Important UI rules:** When the shelf holds 16–19/20 items and the batch is 5, say **“Need 5 free slots”** or **“Restock at 15/20”**, *not* “Shelf full.” When coins are insufficient, show **“Need 10c”**. If an upgrade is blocked by the reserve rule, distinguish it from a normal affordability failure.

**Scheduling contract:** The economy uses elapsed **game time**, not wall-clock time. Process all due customer events in order up to a requested elapsed time, then save the resulting state. At exactly `t = 300s`, process the customer due at `t = 300s` **before** `session_end` (with the baseline three-second interval this gives 100 opportunities). Do not generate arrivals while hidden. Ignore gameplay input once the session has ended. This avoids skipped/duplicated customers during irregular frame updates or refreshes.

**Economy architecture:** Put rules in a small pure TypeScript state/update module; Phaser displays its results and sends player actions. An optional headless runner can call the *same* module later, but a simulator is **not** a P0/P1 dependency.

**Config validation before play:** positive integer costs/quantities, `restockBatch <= shelfCap`, positive interval and session length, valid starting stock, sufficient starting cash for a restock, and positive nominal unit contribution at level 0. Invalid config should fail clearly during development rather than creating an unexplained soft lock.

## 5. Economy model and locked baseline

### Formulas

- `salePriceAt(L) = salePrice + upgradePriceStep * L`
- `upgradeCostAt(L) = Math.round(upgradeBaseCost * upgradeCostGrowth ** L)`
- Maximum scheduled customer arrivals: `Math.floor(sessionSeconds / customerInterval)` (**including** an arrival at the session end if exactly due).
- Nominal contribution per potion *after replenishment*: `salePriceAt(L) - restockCost / restockBatch`. **This is an approximation**, not realised profit: initial stock is free, cash is paid in batches, and upgrades have costs.
- **Gross sales revenue** = sum of positive `sale` amounts.
- **Closing coin balance** = `startCoins + gross sales revenue - restock spending - upgrade spending`.
- **Missed sales** = count of arrivals when `stock === 0`.

### Config files (`src/config/`)

| Key | Meaning |
|---|---|
| `id` | Immutable balance version, included in save/CSV (`baseline-v1`, `revised-v1`). |
| `sessionSeconds` | Five-minute session, normally 300. |
| `startCoins`, `startStock` | Starting state. |
| `shelfCap`, `restockCost`, `restockBatch` | Stock capacity and fixed-batch restocking. |
| `salePrice`, `customerInterval` | Base sale price and demand frequency. |
| `upgradeBaseCost`, `upgradeCostGrowth`, `upgradePriceStep` | Better Brews cost/benefit curve. |
| `rankThresholds` | **Provisional presentation values** only; do not treat as validated success criteria. |

### Frozen AI-proposed baseline: `baseline-v1`

The numbers below are **unchanged from v1**. The v1 document attributes them to an earlier Claude Code session before playtesting; preserve the actual prompt/session and commit if available rather than presenting the attribution as independently verified here. Do not retrospectively edit these numbers after inspecting results.

| Key | Baseline value |
|---|---:|
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
| `rankThresholds` | Bronze 500 · Silver 1500 · Gold 3000 (**unvalidated**) |

**Quick sanity check, not a test result:** With 300 / 3 = **100 customer opportunities**, sales at the base 5c price yield at most **500c gross revenue** before upgrades. Silver (1500c) requires an average of 15c per successful sale; Gold (3000c) requires an average of 30c, despite starting at 5c and paying exponentially rising upgrade costs. These medals may be poor targets; **validate before shipping them**. This calculation does **not** establish that either rank is impossible.

### Config selection and comparison integrity

- Default public build: `revised-v1` **after that config has actually been tested and accepted**; otherwise baseline.
- `?config=baseline` or `?config=revised` explicitly selects a version for evidence. Show version in the pause menu and CSV.
- Use a **separate local save key per config** (for example `dungeon-counter-save:v2:baseline-v1`) so swapping the URL parameter cannot overwrite/discard a different balance version's unfinished run.
- **Keep the underlying rules identical** between configs. The solvency guard, pause behaviour and logging are shared mechanics, not tuning knobs. Compare only explicitly changed economy parameters.
- On malformed/incompatible saved data, show a non-blocking explanation and allow a fresh run; never label a failed save as “Saved.”

## 6. Telemetry and balancing questions

**Collect enough evidence to answer the client's specific complaint without inventing a sophisticated analytics platform.** These are suggested metrics, not claims of actual results.

| Question | Primary metric | Definition / caveat |
|---|---|---|
| “How long until something changes?” | **Time to first upgrade** | Game time of first `upgrade` row; `N/A` if never purchased. Player-choice-dependent. |
| “Was there nothing to do?” | **Longest gap between manual actions** | Seconds between `restock` / `upgrade` actions, counting start/end boundaries. A **proxy for low interaction**, not proof that an action was unavailable. |
| “Are upgrades too far apart?” | **Upgrade spacing** | Time between successive `upgrade` rows; `N/A` if fewer than two. |
| “Does money snowball late?” | **Revenue/minute** | Sum of `sale` amount in minute 2 versus minute 5, using game-time 60s buckets. Not the same as net profit. |
| “Can stock management fail?” | **Missed sales** | `missed_sale` event count. |
| “Did the economy actually improve?” | **Closing balance, total spend and revenue** | Reconcile from signed CSV `amount` values and initial coins. |

**Removed as mandatory:** “time with no affordable action” and “sampled unspent surplus.” V1 claimed they could be recomputed from the existing event rows, but precise action-availability intervals require additional state reconstruction or deliberate state samples. Only include those advanced metrics later if the implementation actually records enough data.

**Comparison protocol:** Use approximately the **same manual strategy** in all evidence runs: restock when stock reaches 1 and affordable; buy an upgrade as soon as the guard allows it; otherwise wait. Record any deviation in `balancing/notes.md`. This reduces (but does not eliminate) player-strategy differences between baseline and revised. Avoid treating two tiny samples as statistically significant.

## 7. Screen layout and visual direction

**Reference:** 390 × 844 logical design, scaled to portrait. Art direction uses the *assumed* Dungeon Counter palette, not a real customer's design system.

```text
┌──────────────────────────────┐
│  🪙 125c       ⚗ 7/20     ☰ │  HUD: coins, stock, pause
│            3:42              │  Countdown
├──────────────────────────────┤
│     [shelf: potion icons]    │
│                              │  Static CC0 shop background;
│    [adventurer] [counter]     │  small sale / missed-sale feedback
│              +7c             │
├──────────────────────────────┤
│  BETTER BREWS       Lv 1     │
│  Price 7c → 9c; cost 75c    │  Upgrade info and affordability
│                              │
│ ┌────────────┐ ┌───────────┐ │
│ │ RESTOCK +5 │ │ UPGRADE   │ │  Large tap targets
│ │    10c     │ │    75c    │ │
│ └────────────┘ └───────────┘ │
│ [Need 5 free slots / ...]   │  Text reason for a disabled action
│                     ✓ Saved  │  Only after successful save
└──────────────────────────────┘
```

| Role | Brand colour |
|---|---|
| Background/HUD/ink on light surfaces | Dungeon Ink `#222836` |
| Coins, primary upgrade CTA, positive sale popup | Lantern Gold `#E8B85B` |
| Stock and restock CTA | Potion Jade `#39A68D` |
| Card and summary panels | Aged Parchment `#F3E6C9` |
| Decorative trim, secondary emphasis | Ember Copper `#B85C42` |

- **Art:** choose only a few consistent, licence-verified CC0 sprites, preferably from Kenney's Roguelike/RPG and UI collections. Record exact pack/item, creator, licence and source URL in `CREDITS.md`. Verify individual OpenGameArt item licences (not everything on that site is CC0). **No AI-generated artwork**.
- **Motion:** static shop scene plus a brief incoming adventurer cue / sale popup if time permits. The economy must work without animation; **no pathfinding**.
- **Type:** system sans-serif and tabular numbers for the economy; Georgia Bold title only, as in the assumed brand guide.
- **Accessibility:** numerical/word labels and reason text accompany visual states; do not rely on colour alone.
- **Audio:** out of scope.

## 8. Save, resume and resilience

- Store serialisable state and event rows under the **versioned, per-config** `localStorage` key: `{ schemaVersion, configId, coins, stock, upgradeLevel, elapsedSeconds, nextCustomerAt, finished, events[] }` (plus optional `runId`).
- Save synchronously after economy events and before hiding / page exit. Treat storage as best-effort: wrap read/write in error handling, continue in memory if blocked/full, and show a truthful **“Not saved”** status.
- On reload of an unfinished run, resume from the saved game-time and next scheduled arrival; do **not** make up elapsed time while closed.
- Pause both timer and economy when menu opens or the tab is hidden. Avoid replaying due customers a second time after resume.
- On completion, persist the **finished summary and its log** until explicitly replaced or reset, so refresh does not erase the only export copy.
- Confirm destructive reset/new-day actions whenever an existing event log would be replaced. No cloud save, identity or background progress.

## 9. Event log and CSV export

Every **economic** action creates one event row, with values **after** the event. Start, resume and end markers may have amount `0`. Local export is user-initiated; data is never uploaded.

| Column | Example | Why |
|---|---|---|
| `run_id` | `run-7f12` | Anonymous **per-run** label to separate multiple CSVs during SQL aggregation; not a user/device ID. |
| `run_type` | `played` | Distinguish real play evidence from optional `simulated` rows. |
| `config_id` | `baseline-v1` | Which economy generated the result. |
| `elapsed_s` | `42.0` | Active game seconds since start. |
| `event` | `sale` | `session_start`, `sale`, `missed_sale`, `restock`, `upgrade`, `resume`, `session_end`. |
| `amount` | `7` | Signed coin delta: sales +, restock/upgrade −, other 0. |
| `coins` | `135` | Balance after the event. |
| `stock` | `6` | Potions after the event. |
| `upgrade_level` | `1` | Better Brews level after the event. |
| `price` | `7` | Selling price after the event. |

- Sample header: `run_id,run_type,config_id,elapsed_s,event,amount,coins,stock,upgrade_level,price`.
- Record `session_start` with the **starting balance** and `amount=0`; it is *not* a sale.
- **Reconciliation invariant:** `end.coins = startCoins + SUM(amount)` across the run, and `sale` amounts summed together equal the summary's gross sales revenue.
- Export a CSV with a locally generated name such as `dungeon-counter_baseline-v1_played_20261020-1945.csv`; filename time is for organising exports, not an event-level identity/timestamp. Sanitize CSV fields if adding arbitrary text later; present schema uses controlled values.
- CSV download on mobile must be tested. If the browser opens a share/save sheet instead of silently saving, that is fine; the user must still be able to obtain the file.
- No remote telemetry, analytics SDK, personal details or player profiles.

## 10. Three-day balancing and evidence plan

1. **Preserve provenance.** Commit `baseline-v1` and its source note/prompt before editing; do not retune the original after observing outcomes.
2. **Play the baseline.** Export at least one **completed real** session (target two if time allows) with the defined manual action policy. Record observed pain points, not imagined ones.
3. **Inspect and diagnose.** A **single small SQL script**, using a chosen CSV-capable engine such as DuckDB, computes revenue, spending, missed sales and first-upgrade timing grouped by run/config. Keep the script and its execution instructions in `balancing/`.
4. **Create `revised-v1`.** Change one headline economy parameter (or one tightly justified set) based on measured evidence, **not** on an assumed AI mistake. Note the old/new value and hypothesis.
5. **Repeat the same play policy** with the revised config; export at least one completed real session (target two). Keep played and any simulated files distinctly labelled.
6. **Build one small balancing table** (Markdown or CSV is sufficient): baseline vs revised parameter(s), first-upgrade time, gross revenue, closing balance, missed sales, plus a written interpretation. Add a before/after chart **only if time remains**.
7. **State what the data supports.** If the baseline is not flawed, call this a *controlled tuning experiment*, not “AI got the balance wrong and I fixed it.” If the revised version is not better, report that too.

**Optional, after P0/P1:** one small headless runner calling the same pure economy update function with the same automated policy. Output `run_type=simulated` and keep its curves **separate** from observed played runs. Never treat automated sessions as user playtests.

**What counts as a useful case-study claim:** “The initial config was generated with AI assistance; I measured the first upgrade at X seconds in a played run, changed Y from A to B, and observed Z seconds using the same action policy.” Only fill X/Y/A/B/Z with **real collected values**.

## 11. Timebox, scope and acceptance

### Suggested ~22-hour implementation plan

| Day | Approx. time | Deliverable |
|---|---:|---|
| **1 — game loop** | 7 h | Project scaffold, frozen baseline, pure economic rules, deterministic scheduling, two action buttons, basic shop layout, quick invariant tests. |
| **2 — robustness & evidence** | 7 h | Save/resume, versioned saves, event rows, CSV export, pause handling, mobile checks. |
| **3 — tuning & portfolio** | 8 h | Real baseline/revised runs, compact SQL + balancing table, corrections, CC0 credits, deploy, phone smoke test, screenshots. |

**In scope:** one product, one upgrade, fixed customer tick, stock, simple scene, 5-minute session, pause/summary, browser save, local CSV, two balance configs, one real before/after test and a small SQL aggregation.

**Nice to have:** medals after evidence-based calibration; tiny adventurer animations; an automated headless economy driver; a chart or Qlik visual.

**Out of scope:** more products, crafting, dungeon exploration, NPC AI/pathfinding, random customer behaviours, cloud saving, offline earnings, accounts, leaderboards, monetisation, audio, production analytics or AI-generated artwork.

**Acceptance checks:**

- [ ] Start and complete a five-minute session in a mobile browser; all controls work without a keyboard.
- [ ] Exactly scheduled arrivals are processed once; hiding/refocusing and refresh do not make time pass or replay a sale.
- [ ] Restock obeys capacity and affordability; an upgrade cannot spend the last restock reserve; no normal path leads to a dead shop.
- [ ] Save/resume returns the previous state on a tested phone; unavailable storage fails visibly and gracefully.
- [ ] A completed run's CSV balances: `startCoins + signed deltas = final coins`, with gross revenue equal to summed sales.
- [ ] At least one real baseline and revised session with exported CSVs, a documented parameter change, an executable SQL aggregation and honest interpretation.
- [ ] All used visual assets have individually checked CC0 licences and appear in `CREDITS.md`; no AI-generated images.
- [ ] Portfolio disclosure distinguishes **fictional client**, **AI-assisted development**, **human-authored CC0 assets** and **actual testing performed**.

**Explicit cuts if time slips:** remove medals → animations → optional simulator → chart/dashboard. **Do not cut** the core loop, local CSV evidence, truthful credits, or at least one real before/after comparison.

## 12. Decisions resolved from v1 / remaining assumptions

1. **What does rank measure?** **Gross sales revenue**, not closing balance, to avoid penalising upgrades bought near the end. **But medals are P2** until sensible shared thresholds are established from test runs; the summary always shows the underlying revenue.
2. **When can restock occur?** Keep **fixed five-potion batches** at a flat cost, only if the entire batch fits. The UI states the remaining-space requirement precisely. No partial restock mechanics.
3. **Which config goes public?** Use tested revised by default **only after acceptance**; expose baseline via explicit query parameter for comparison and keep saves separate by config.
4. **Name of upgrade?** Keep **Better Brews**; it communicates the one upgrade's effect without requiring new art or rules.
5. **What does a good five-minute run look like?** Still an **unverified design assumption**: a meaningful first upgrade within the session, room for more than one choice, and manageable stockouts. Do not bake target performance into the case study before measuring.
6. **What AI actually did:** Use the original tool/session record, code commits and your own notes. The v1 claim about the baseline source is carried forward as a **source note**, not fresh verification that particular AI-generated code or art has already been produced.

## 13. Change log — v1 → v2 (with reasons)

| # | Change | Why it was necessary / benefit |
|---|---|---|
| 1 | **Made P0/P1/P2 priorities and ~22-hour three-day plan explicit.** | The v1 *“everything in sections 3–10”* commitment also pulled a full simulator and multiple analytics outputs into a short prototype. Protects the playable game and evidence when time runs out. |
| 2 | **Moved headless simulation to optional; retained pure economy module.** | Shared code remains testable, but a simulator is not needed to prove a measured change using real exported sessions. Avoids an extra build/deployment burden. |
| 3 | **Added upgrade solvency guard (reserve one restock cost).** | Without a guard, buying an upgrade while out of stock could reduce coins below the restock price, leaving customers unable to buy and the shop permanently stuck. |
| 4 | **Clarified fixed-batch restock and disabled-state messaging.** | Stock at 16/20 blocks a +5 batch even though the shelf is *not full*. Accurate wording makes the rule understandable. |
| 5 | **Defined game-time event ordering and exact end-boundary behaviour.** | Prevents duplicated/skipped customers on refresh, tab suspension, frame stalls or the 300-second boundary; matches the stated 100-customer baseline model. |
| 6 | **Added explicit config validation and a few invariants.** | Catches impossible economies early (e.g. insufficient starting cash, oversized restock batch) instead of spending playtest time debugging silent soft locks. |
| 7 | **Separated gross revenue from cash balance and qualified per-potion margin.** | The v1 “gross margin” shortcut ignored free opening inventory, batched restock payments and upgrade costs. The case study needs financially coherent terms. |
| 8 | **Flagged Bronze/Silver/Gold thresholds as unvalidated and moved medals to polish.** | With just 100 scheduled customers and a 5c starting price, 1500c/3000c need substantial upgrades. They should not be presented as achievable without testing; keep the raw results usable regardless. |
| 9 | **Replaced ambiguous idle/unspent-surplus metrics with computable proxies.** | The v1 export lacks precise intervals of button availability or a sampling stream. “Time between manual actions” can be computed, but must not be mislabelled “time when no action is possible.” |
| 10 | **Added a consistent played-run comparison policy.** | Two manual runs with different restock/upgrade choices cannot isolate a config change. A shared strategy improves comparison credibility even with very few runs. |
| 11 | **Added per-run `run_id` and `run_type` CSV columns.** | Multiple exported sessions otherwise cannot be grouped robustly in SQL, and simulated evidence might accidentally be reported as played evidence. Both identifiers are local, not user tracking. |
| 12 | **Specified CSV accounting reconciliation and `session_start` amount semantics.** | Gives the project a concrete, testable data-integrity check; exported rows should reproduce the balance the game displayed. |
| 13 | **Changed from one global save to versioned, per-config saves; preserved finished export.** | Switching `?config=` in v1 discarded a mismatched save and might lose the only copy of play evidence. A finished run must remain exportable on refresh. |
| 14 | **Made storage failures and destructive resets explicit.** | `localStorage` can be unavailable; an unconditional “✓ Saved” is misleading. Users should not lose logs silently when starting another session. |
| 15 | **Increased nominal button size and required testing after Phaser scaling.** | A 48px design-space target can shrink on smaller screens. Actual touch size and legibility matter more than the reference canvas number. |
| 16 | **Preserved all original baseline numeric values and qualified the AI provenance.** | Maintaining an untouched before-state is essential for an honest AI-assistance case study. The model/source claim is documented as inherited from v1, not newly independently verified. |
| 17 | **Kept CC0 art and accurate credits as acceptance criteria; kept AI art excluded.** | Supports the intended claim of *AI-assisted development* without suggesting that stock/illustration assets were generated by an image model. |
| 18 | **Converted unresolved review questions into decisions, leaving only genuinely untested outcomes open.** | Lets implementation begin without repeated design ambiguity while still distinguishing assumptions from empirical findings. |

---

**Review status:** Proposed v2. No implementation, tests, metrics or client approval are implied by this file. Record empirical numbers and final cuts after the prototype is built.
