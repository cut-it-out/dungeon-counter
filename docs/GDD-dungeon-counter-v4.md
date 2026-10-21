# Dungeon Counter — Game Design Document (v4)

*Challenge pivot · 21 October 2026 · Three-day AI-assisted portfolio prototype*

> **Fictional client exercise.** Pocket Lantern Games and Nico are fictional, not real commissioners. The project brief is `docs/BRIEF_dungeon-counter-idle-sim.md`, and the assumed visual identity is `docs/dungeon-counter-brand-palette.md`. v4 replaces the idle-sim loop of v3 with a five-minute shop-management challenge, after the developer's own playtest review (build log Session 6). v1–v3 are kept for provenance; section 16 records what changed from v3 to v4 and why. Unchanged sections are carried over from v3 with their wording.

## 0. Decision snapshot and delivery priority

**Decisions for v4:** One potion product; **predictable customer rushes** between calm stretches; a **restock cooldown**; two **competing upgrades**, *Better Brews* (higher price) and *Bigger Crates* (more potions per crate); **net profit** as the score, with a **personal best** per config; five-minute deterministic sessions; Phaser + Vite + TypeScript; same-device saving; local CSV export; a small balancing analysis on the new loop. No remote telemetry and no AI-generated artwork.

**Why the pivot:** after several rounds of the v3 loop, the developer judged it solved: "restock → wait for sales → upgrade → repeat", with "very little meaningful decision-making, challenge or replay motivation". Two complete played runs on `baseline-v1` agree: both served 100/100 customers with 20 restocks and five upgrades, and missed no sales (§16). The pivot reuses the economy module, UI overlay, save system and telemetry; it is not a rebuild.

**Brief deviation:** the brief's must-haves say "one upgrade track". v4 has two, because a single upgrade track offers no investment choice. Like the 3-day time box, the case study states this deviation.

**Build in ~3 focused days (18–24 hours) with AI assistance**, one day over the brief's ~2-day box; the pivot added unplanned work inside it, and the case study says how much.

**Delivery priority:**

- **P0 — playable:** deterministic economy with rushes, cooldown and both upgrades; clear actions on a portrait UI; five-minute ending; dead-shop guard; full-session headless runs.
- **P1 — portfolio evidence:** save/resume, event CSV, played runs on `challenge-v1` and a revised config, a small SQL aggregation and balancing summary, the strategy dominance check.
- **P2 — presentation:** medals, extra sprite animation, a simulator CLI writing `run_type=simulated` CSVs, a dashboard.

## 1. Overview

**Pitch:** You run a tiny potion stall at the mouth of a dungeon. Adventurers buy potions when you have stock, and three times a day a rush of them arrives. Restocking takes a few seconds to come round again, so you have to be stocked up before a rush. Spend your coins on better brews (more per sale) or bigger crates (more potions per restock), but every coin spent is profit you only get back if it pays off before the shop closes. After five minutes the shop closes; beat your best profit.

**Design pillars**

1. **Five minutes, complete:** one compact session with a clear ending and a score to beat.
2. **Readable choices:** coins, stock, the next rush, upgrade costs and effects are legible on a phone.
3. **Auditable economics:** configs, player actions and measured changes can be checked from saved configs and CSVs.

**Player decisions:** *Am I stocked for the next rush?* · *Brews or Crates: margin or volume?* · *Is this upgrade still worth buying this late?* Arrivals are automatic; there is no tapping to serve customers.

## 2. Player, platform and technology

Unchanged from v3: casual mobile player with ~5 minutes; browser over HTTPS, deployed on Cloudflare Pages; mobile portrait (390 × 844 reference); taps or clicks, primary buttons at least ~48 CSS px tall after scaling; Phaser, Vite, TypeScript, Vitest; visible labels as well as colours, tabular numbers, no audio dependency, pause on backgrounding.

## 3. Session flow

```text
Title ── New day ──► Play (5:00) ──► Summary ──► New day
  │                    │                  │
  ├── Continue*        └── Pause menu     └── Export CSV
  ├── Last summary*       ├ Resume
  └── Best profit*        ├ Export CSV
                          └ Reset run (confirm)
*Only when a matching save / finished run / best exists.
```

- **Title:** *New day*, plus *Continue* for an unfinished save and *Last summary / Export* for a finished one; the personal best profit for this config when one exists.
- **Play:** the stall, coins, stock, timer, rush countdown, both upgrade lines and three action buttons.
- **Summary:** **profit** as the headline with the personal best (*New best!* when this run set it), then sales revenue, restock spending, Better Brews and Bigger Crates spending with their levels, potions sold / missed, customers served per rush, closing balance.
- **Pause menu and New day confirmation:** unchanged from v3.

## 4. Core mechanics and edge cases

| Mechanic | v4 rule |
|---|---|
| **Stock** | One item: potions. Integer count in `[0, shelfCap]`. |
| **Restock** | Spend exactly `restockCost` to add one crate of `batchAt(cratesLevel)` potions immediately. Available only if `stock <= shelfCap - batch`, `coins >= restockCost` and the **cooldown** has ended: `restockCooldown` seconds of game time after the previous restock. No partial purchase. |
| **Customers** | Calm stretch *i* (0-based, counting the stretches around the rushes) has one arrival every `customerInterval × calmSpeedup^i`, rounded to whole ms; without `calmSpeedup` the calm interval is constant (Session 8); each **rush window** has one every `intervalS`. Each stretch places arrivals at its start + k × its interval, up to and including its end (a rush's start is exclusive). An arrival buys one potion if available; otherwise `missed_sale`. Deterministic, no randomness or pathfinding. |
| **Better Brews** | Pay `upgradeCostAt(level)` to raise the sale price by `upgradePriceStep`. No level cap. |
| **Bigger Crates** | Pay `cratesCostAt(level)` to raise the crate size by `cratesBatchStep`, at the same `restockCost`. Capped at `cratesMaxLevel`. A bigger crate needs more free slots, so it can only be bought onto a lower shelf. |
| **Dead-shop guard** | Unchanged in principle from v3 §15: an upgrade is blocked when even selling the whole shelf at the price *after* it could not pay for a restock: `coins − cost + stock × priceAfter < restockCost`. For Better Brews `priceAfter = salePriceAt(level + 1)`; for Bigger Crates the price is unchanged. Reason text *"Need Nc to stay stocked"*. A cooldown never makes the shop dead: it ends on its own. |
| **Timer** | Exactly `sessionSeconds` of active game time; pauses on menu, hidden tab and closed browser; no offline gains. |

**UI rules:** blocked actions say why: *"Need 10c"*, *"Need 8 free slots"* (the current crate size), *"Ready in 3s"* (cooldown), *"Need 53c to stay stocked"* (guard), *"Max level"*. When both apply, Restock reports free slots first, then coins, then the cooldown.

**Scheduling contract:** unchanged from v3, with one schedule source: `arrivalTimes(cfg)` (integer ms, built once per config) feeds the economy, the customer walk and the headless runner; nothing else computes arrivals. The arrival due exactly at the session end is processed before `session_end`.

**Economy architecture:** pure TypeScript module; Phaser displays it and sends actions. The headless runner drives the same module with scripted strategies (§6).

**Config validation before play:** v3's rules, plus: `restockCooldown >= 0`; positive Crates cost, step and max level; `restockBatch + cratesBatchStep × cratesMaxLevel <= shelfCap`; rush windows sorted, non-overlapping, inside the session, with a positive interval.

## 5. Economy model and locked baseline

### Formulas

- `salePriceAt(L) = salePrice + upgradePriceStep × L` (Better Brews level L)
- `upgradeCostAt(L) = round(upgradeBaseCost × upgradeCostGrowth ^ L)`
- `batchAt(C) = restockBatch + cratesBatchStep × C` (Bigger Crates level C)
- `cratesCostAt(C) = round(cratesBaseCost × cratesCostGrowth ^ C)`
- **Net profit** = closing coin balance − `startCoins` = gross sales revenue − restock spending − upgrade spending. This is the score.
- Refill rate during a rush, at most: `batchAt(C) / restockCooldown` potions per second, plus whatever is on the shelf when the rush starts.
- Calm interval of stretch i: `round(customerInterval × calmSpeedup^i)` ms; `calmSpeedup` is optional, in (0, 1], and absent means 1.

### Config files

`src/config/challenge-v1.json` (frozen baseline) and, after evidence, `challenge-v2.json` (revision). `?config=baseline` plays `challenge-v1`, `?config=revised` plays `challenge-v2`; the public default stays `challenge-v1` until the revision is accepted. The v3 idle config is kept unchanged in `balancing/configs/baseline-v1.json` as the reference for its CSVs, and the playable idle build is the git tag `idle-loop-v1`.

### Frozen AI-proposed baseline: `challenge-v1`

Proposed by Claude Code in Session 6 without simulation, accepted by the developer as the plan, frozen once committed (Session 7). Tuning goes in `challenge-v2`.

| Key | Value |
|---|---:|
| `sessionSeconds` | 300 |
| `startCoins` / `startStock` | 20 / 5 |
| `shelfCap` | 20 |
| `restockCost` / `restockBatch` | 10 / 5 |
| `restockCooldown` | 5 s |
| `salePrice` | 5 |
| `customerInterval` (calm) | 4 s |
| `rushes` | 60–80 s @ 1 s · 150–175 s @ 0.75 s · 240–270 s @ 0.6 s |
| Better Brews `upgradeBaseCost` / `upgradeCostGrowth` / `upgradePriceStep` | 50 / 1.5 / 2 |
| Bigger Crates `cratesBaseCost` / `cratesCostGrowth` / `cratesBatchStep` / `cratesMaxLevel` | 40 / 1.5 / 3 / 3 |

**Arrival count:** 55 calm + 20 + 33 + 50 rush = **158** opportunities (v3: 100), the last at 298 s. **Design intent, not a result:** at the base crate, restocking refills at most 1 potion/s; rush 1 (1/s) just keeps pace, rushes 2 (1.33/s) and 3 (1.67/s) outrun it by about 8 and 20 potions, which a full 20-slot shelf or bigger crates must cover.

### Revision: `challenge-v2` (Session 8)

`challenge-v1` plus **`calmSpeedup` 0.85**, nothing else: calm stretches every 4 s → 3.4 s → 2.89 s → 2.456 s, giving 69 calm + 103 rush = **172** arrivals, the last at 299.472 s. Reason: the developer's play of `challenge-v1` found the calm stretches between rushes slow. Hypothesis, old/new values and evidence in `balancing/notes.md`. `?config=revised` plays it; the public default stays `challenge-v1` until it is accepted.

## 6. Telemetry and balancing questions

The v3 metrics still apply (first-upgrade time, idle time, action spacing, upgrade spacing, revenue per minute, unspent surplus, missed sales, closing balance, reconciliation). v4 adds:

| Question | Metric | Definition / caveat |
|---|---|---|
| "Is there a real choice?" | **Strategy dominance** | Net profit of scripted strategies on the same config (below). If one always wins by a wide margin, the Brews-vs-Crates choice is fake. Headless, not evidence of player behaviour. |
| "Do rushes create pressure?" | **Rush service** | Served / arriving customers per rush window, from `sale` / `missed_sale` rows inside each window. |
| "Is the score worth chasing?" | **Profit spread** | Net profit across played runs of the same config, and how far a run lands from the strategies' range. |
| "Do players stop investing at the right time?" | **Last upgrade time** | Game time of the last `upgrade` / `crates_upgrade` row; late upgrades lower profit. |

**Idle time with a cooldown:** v3 relied on availability being a function of the preceding row. With a cooldown, Restock can become available *between* rows when the cooldown ends. The SQL therefore derives `ready_at = elapsed_s of the latest restock row + restockCooldown` and splits each `LEAD(elapsed_s)` interval at `ready_at`: the part before it counts as idle if no upgrade is available, the part after only if slots or coins also block Restock. The headless test (`tests/policy-session.test.ts`, `idleMs`) implements the same split.

**Headless strategies** (`src/economy/policy.ts`): every strategy restocks whenever it can while the shelf won't cover the remaining arrivals; none upgrades in the last 60 s (`UPGRADE_HORIZON_S`, an assumption shared by all so the comparison measures the choice, not end-game waste). Upgrade rules: `none`; `brews-only`; `crates-first` (Crates to max, then Brews); `cheaper-first` (whichever is cheaper now, waiting for it). The runner reacts after every arrival and when the cooldown ends.

**Sanity check on `challenge-v1` (`npm test` output, Session 7; not evidence):** none 475c (missed 1); brews-only **867c**, Brews 5, missed 1; cheaper-first 803c, Brews 4 / Crates 3, missed 0; crates-first 694c, Brews 3 / Crates 3, missed 0. Two balancing problems are visible before any play: **Better Brews dominates** (Crates lowers profit for a perfect restocker), and **the rushes barely bite** for a perfect restocker (one missed sale with no upgrades at all). Played runs show whether a human, who does not restock perfectly, sees the same. `challenge-v2` addresses what the played data confirms.

**Comparison protocol:** played evidence runs are **free play**: the point of v4 is real decisions, so no fixed manual policy. Comparisons between configs therefore read played runs alongside the headless strategies, not as a controlled A/B. Record anything unusual in `balancing/notes.md`. Avoid treating tiny samples as significant.

## 7. Screen layout and visual direction

```text
┌──────────────────────────────┐
│  COINS 125c   STOCK 7/20  II │  HUD
│            3:42              │  Countdown
│         [Rush in 0:12]       │  Copper "RUSH! 0:08" badge during a rush
├──────────────────────────────┤
│     [shelf: potion icons]    │  Static CC0 shop; customers walk in, buy, leave
│    [adventurer] [counter]    │  (faster during rushes)
├──────────────────────────────┤
│ BETTER BREWS LV 1  7c → 9c   │  Upgrade card: both tracks
│ BIGGER CRATES LV 0  5 → 8    │
│ ┌────────┐┌────────┐┌───────┐│
│ │RESTOCK ││ BREWS  ││CRATES ││  Three ≥ 48 px buttons
│ │+5  10c ││  75c   ││  40c  ││
│ └────────┘└────────┘└───────┘│
│ Ready in 3s  Need 75c        │  Reason under each disabled action
│                     ✓ Saved  │
└──────────────────────────────┘
```

Colours as in v3: Restock on Potion Jade, Brews on Lantern Gold, Crates on Aged Parchment with Ember Copper trim; the rush badge is Ember Copper. Art, type, accessibility and audio rules unchanged.

## 8. Save, resume and resilience

As v3, with `schemaVersion` 2 under `dungeon-counter-save:v2:<configId>`, holding `{ schemaVersion, configId, runId, coins, stock, upgradeLevel, cratesLevel, elapsedMs, nextCustomerAt, restockReadyAt, finished, events[] }` in integer game ms. A save from the idle build (v1 key) is simply not read. The **personal best** `{ profit, runId }` lives under its own key `dungeon-counter-best:v1:<configId>`, so New day and Reset never erase it; it is written only when a finished run beats it, and re-opening that run's summary still shows *New best!*.

## 9. Event log and CSV export

As v3, with one column appended and one event added:

| Column | Example | Note |
|---|---|---|
| `run_id`, `run_type`, `config_id`, `elapsed_s`, `event`, `amount`, `coins`, `stock`, `upgrade_level`, `price` | | Unchanged; `upgrade_level` is the Better Brews level. |
| `crate_level` | `1` | Bigger Crates level after the event. Appended last so idle-loop CSVs keep their column positions. |

Events: `session_start`, `sale`, `missed_sale`, `restock`, `upgrade` (Better Brews), `crates_upgrade`, `resume`, `session_end`. The reconciliation invariant is unchanged: `end.coins = startCoins + SUM(amount)`, and summed `sale` amounts equal gross revenue. The cooldown is not a row; it is derived from `restock` rows and the config (§6).

## 10. Balancing and evidence plan

1. **Preserve provenance.** `challenge-v1` committed before any played run on it; the idle loop kept as tag `idle-loop-v1` with run-7355 and run-2ccd as the before-evidence, marked obsolete in `balancing/obsolete/idle-loop-runs/` so the SQL over `balancing/runs/` skips them (Session 8).
2. **Play `challenge-v1`.** At least one, target two, complete free-play sessions; export into `balancing/runs/`.
3. **Inspect.** One SQL script (DuckDB) over all runs: v3's metrics plus rush service, last-upgrade time and profit; the idle split at the cooldown (§6).
4. **Create `challenge-v2`** from what the played data and the dominance check show, one headline change or one tightly justified set; old/new values and the hypothesis in `balancing/notes.md`. The strategy report runs on it automatically.
5. **Play `challenge-v2`** the same way, re-run the SQL and the strategies.
6. **Balancing table** with both configs' parameters, profit, rush service, upgrade mix, first/last upgrade and missed sales per run, plus a written reading that says what the data supports, including "v2 wasn't better" if so.
7. **Idle loop vs challenge loop:** the same SQL over the idle runs and the challenge runs shows what the pivot changed (decisions per minute, missed sales, profit spread). Different rules, so this is a design comparison, not a tuning A/B.

**Useful case-study claims:** "Two of my idle-loop runs ended identically, so I redirected the design to …"; "On `challenge-v1` a headless all-Brews strategy beat every mix by X; in my played runs Y; I changed Z from A to B and observed W." Fill with real values only.

## 11. Timebox, scope and acceptance

**In scope:** one product, two upgrades, rushes, cooldown, stock, simple scene, 5-minute session, pause/summary, personal best, browser save, local CSV, two challenge configs, played runs, a small SQL aggregation, the strategy check.

**Out of scope:** unchanged from v3 (more products, crafting, exploration, NPC AI, random customers, cloud save, offline earnings, accounts, leaderboards, monetisation, audio, production analytics, AI-generated art).

**Acceptance checks:** v3's list, with these changes:

- [ ] Start and complete a five-minute session on a phone with three action buttons, each ≥ ~48 CSS px.
- [ ] Rush countdown visible before and during each rush; the cooldown and crate size are shown on the Restock button.
- [ ] No path leads to a dead shop with either upgrade (unit tests and every strategy run).
- [ ] `npm test` passes, including every strategy on every config.
- [ ] Personal best survives New day, Reset and refresh; *New best!* only for the run that set it.
- [ ] CSV reconciles and carries `crate_level`.
- [ ] At least one played run on `challenge-v1` and on `challenge-v2`, a documented change, executable SQL and an honest reading.

## 12. Decisions resolved for v4

1. **Score:** **net profit**, not gross revenue (reverses v3 §12.1). An upgrade bought late is a loss, so "when to stop investing" becomes a decision. Directed, Session 6.
2. **Rush pressure:** a **restock cooldown**. With instant restocking a rush is a bonus, not a challenge. Chosen over a delivery delay (more state and an extra event) and no limit. Proposed by Claude Code, accepted, Session 6.
3. **Bigger Crates effect:** a bigger crate at the same cost, so more potions per cooldown. Margin (Brews) vs volume (Crates). Same session.
4. **Baseline handling:** a new frozen baseline for the new rules; the idle loop is preserved, not config-gated. Same session.
5. **Evidence protocol:** free play plus scripted headless strategies. Same session.
6. **Medals:** still P2; the personal best carries the replay motivation.
7. **What a good five-minute run looks like:** still an assumption to measure: some missed sales in the late rushes for a typical player, a real Brews/Crates split among good runs, and a profit that improves with practice.

## 13–15. Earlier change logs

The v1 → v2 and v2 → v3 change logs and the Session 4 amendments are in `docs/GDD-dungeon-counter-v3.md` §13–15.

## 16. Change log — v3 → v4 (with reasons)

| # | Change | Why |
|---|---|---|
| 1 | **Pivot from an idle sim to a shop-management challenge.** | The developer's playtest review: the loop was solved after a few rounds, with "no real reason to play again". Two played `baseline-v1` runs (run-7355, run-2ccd) both served 100/100 customers with 20 restocks and five upgrades, closing at 202c and 240c. |
| 2 | **Predictable rush windows** between calm stretches. | Demand that varies gives the player something to prepare for; fixed and visible, so preparing is a skill, not luck. |
| 3 | **Restock cooldown.** | Without it a rush adds no pressure: the player refills after every fifth sale. Found by Claude Code's impact review before any code. |
| 4 | **Bigger Crates** as a second upgrade track. | An investment choice: price per sale versus sales captured during rushes. Deviates from the brief's single track; stated in the case study. |
| 5 | **Net profit + personal best + richer summary.** | A score to beat gives replay motivation; profit (not revenue) makes late spending a decision; per-rush service shows what to improve. |
| 6 | **New frozen baseline `challenge-v1`; `baseline-v1` kept as a reference file and git tag.** | v3 §5 compares configs under identical rules; the pivot changes the rules, so it needs its own baseline rather than a retune. |
| 7 | **Free play + strategy dominance check** replaces the fixed manual policy. | A fixed policy plays the same strategy every time, which is the problem the pivot addresses. The headless strategies test whether the choice is real. |
| 8 | **Idle-time definition splits intervals at the cooldown end.** | Availability is no longer constant between rows. |
| 9 | **CSV `crate_level` column and `crates_upgrade` event; save schema 2.** | The second upgrade must be in the evidence; appending the column keeps old CSVs readable by the same SQL. |

---

**Review status:** v4, written after the pivot was implemented (Session 7), so it describes the build. The strategy numbers in §6 are headless sanity checks; no played evidence on the challenge configs exists yet.
