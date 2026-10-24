# Balancing notes

Played runs, deviations and config changes, newest last. Numbers come from the CSVs in `balancing/runs/` or from `npm test` output; headless strategy numbers are sanity checks, not evidence.

## Played runs

| run_id | config | date | notes |
|---|---|---|---|
| run-7355 | baseline-v1 (idle loop, **obsolete**) | 21 Oct 2026 | In `obsolete/idle-loop-runs/`, outside the SQL. Fixed policy. 100 sold / 0 missed, 20 restocks, Brews 5, closing 202c. Before-evidence for the pivot. |
| run-2ccd | baseline-v1 (idle loop, **obsolete**) | 21 Oct 2026 | In `obsolete/idle-loop-runs/`, outside the SQL. Fixed policy. 100 sold / 0 missed, 20 restocks, Brews 5, closing 240c. Before-evidence for the pivot. |
| run-849f | challenge-v1 | 21 Oct 2026 | Free play. 156 sold / 2 missed, 15 restocks, Brews 6, Crates 3, closing 404c (profit +384c). |
| run-3f8a | challenge-v1 | 22 Oct 2026 | Free play, on my phone. 158 sold / 0 missed (every rush customer served), 17 restocks, Brews 6, Crates 3, closing 548c (profit +528c). |

## challenge-v2 (Session 8)

- **Change:** `calmSpeedup` absent (= 1, calm every 4 s all day) → **0.85** (calm stretches every 4 s → 3.4 s → 2.89 s → 2.456 s). Everything else equals `challenge-v1`.
- **Why:** my play of `challenge-v1`: "the game between the rush sections feels slow".
- **Hypothesis:** shorter calm gaps later in the day keep me acting between rushes (more sales and decisions per minute in calm stretches 2–4) without changing the rushes themselves. Expected in played runs: shorter action spacing and less idle time after 80 s, higher profit; missed sales in rushes about the same.
- **Not expected to fix:** the Better Brews dominance seen in the headless strategies.
- **Headless sanity check (`npm test`, Session 8, not evidence):** profit `challenge-v1` → `challenge-v2`: none 475c → 520c, brews-only 867c → 1042c, crates-first 694c → 801c, cheaper-first 803c → 975c. Arrivals 158 → 172. Brews still dominates.
- **Status:** superseded as the revision candidate by `challenge-v3` (Session 9); still playable as `?config=challenge-v2`. Not accepted.

## challenge-v3 (Session 9, my hand-made config)

- **Changes from challenge-v2:** `calmSpeedup` 0.85 → **0.7** (calm stretches every 4 s → 2.8 s → 1.96 s → 1.372 s); rush intervals 1 / 0.75 / 0.6 s → **1.2 / 0.8 / 0.65 s**. Everything else equals `challenge-v1`.
- **Why (my words):** "I modified the speed as it was better but still felt slow. also tuned the rush speeds slower a bit so there is not that huge difference between them compared to the baseline - in the hopes of having the "normal" speed feel "better"".
- **Arrivals:** 94 calm + 16 / 31 / 46 rush = 187 (v1 158, v2 172). Rush 1 now asks 0.83 potions/s, below the 1 potion/s a base crate refills, so it can't outrun restocking; rushes 2 and 3 outrun it by about 6 and 16 potions, less than a full 20-slot shelf.
- **Headless sanity check (`npm test`, Session 9, not evidence):** none 565c, brews-only 1257c, crates-first 986c, cheaper-first 1055c; every strategy serves every rush customer (0 missed). Brews dominates by more than on v1/v2 (brews-only leads cheaper-first by 202c, v1: 64c).
- **To check in play:** does the day feel less slow, and do the rushes still feel like pressure? My run-3f8a already served every rush customer on v1, whose rushes are faster.
- **Status:** the public default since Session 9, by my direction, before any played run on it ("also please make the revised as the default to load"). This is not an evidence-based acceptance; `?config=baseline` still plays `challenge-v1`, and `?config=challenge-v2` plays v2.

## S10 phone smoke test (Session 9)

- A full session played and exported on my phone (run-3f8a, `challenge-v1`).
- Refresh → Continue: "refresh + continue worked well".
- Dead-shop guard message: "need Nc to stay stocked message is ok".
- Export on the phone opens the share menu instead of a direct download; the file reached me. Kept unless I decide otherwise.

## S13 summary query (Session 10)

`uv run --with duckdb balancing/run_sql.py` prints one block per run in `balancing/runs/*.csv` (`--csv` for CSV; a glob argument reads other CSVs). The query is `balancing/summary.sql`; config constants come from `src/config/*.json`. Checked against the headless strategies: on all 12 strategy runs (4 strategies × 3 configs) profit, missed sales, rush service and reconciliation match `npm test` exactly, and idle time matches within the CSV's 0.1 s rounding.

First reading of my two played `challenge-v1` runs (not yet a comparison):

| | run-849f | run-3f8a (phone) |
|---|---|---|
| Profit | +384c | +528c |
| Missed (rushes served) | 2 (20/20 33/33 49/50) | 0 (20/20 33/33 50/50) |
| Brews / Crates level | 6 / 3 | 6 / 3 |
| First / last upgrade | 25.5 s / 260.6 s | 32.7 s / 256.0 s |
| Idle (no action available) | 149.5 s | 171.3 s |
| Longest idle stretch | 33.5 s | 31.4 s |
| Mean / longest gap between my actions | 12.0 s / 37.8 s | 11.1 s / 32.0 s |
| Revenue minute 2 → minute 5 | 200c → 876c | 252c → 917c |

- No action was available for half the day or more, which matches "the game between the rush sections feels slow".
- I maxed Bigger Crates in both runs, although the headless strategies make the most profit with Brews only. Whether Crates helped me or cost me is the S14 question.
- Both last upgrades came after 255 s, inside the last minute, where an upgrade can hardly pay for itself under the profit score.

### First challenge-v3 runs (Session 10)

From `run_sql.py` over `balancing/runs/` (5 runs, all complete, all reconcile):

| | run-849f v1 | run-3f8a v1 | run-dce4 v3 | run-8139 v3 | run-9f2e v3 |
|---|---|---|---|---|---|
| Profit | +384c | +528c | +563c | +345c | +540c |
| Missed (rushes served) | 2 (20/20 33/33 49/50) | 0 (20/20 33/33 50/50) | 2 (15/16 30/31 46/46) | 12 (16/16 30/31 46/46) | 3 (16/16 28/31 46/46) |
| Brews / Crates | 6 / 3 | 6 / 3 | 7 / 2 | 7 / 2 | 7 / 2 |
| First / last upgrade | 25.5 / 260.6 s | 32.7 / 256.0 s | 32.5 / 263.7 s | 66.4 / 273.3 s | 32.7 / 265.0 s |
| Idle | 149.5 s | 171.3 s | 57.3 s | 45.1 s | 51.8 s |
| Longest idle stretch | 33.5 s | 31.4 s | 7.5 s | 7.9 s | 11.2 s |
| Mean gap between my actions | 12.0 s | 11.1 s | 10.0 s | 10.3 s | 8.6 s |

- The calm stretches no longer stall the day: idle time fell from 150–171 s on v1 to 45–57 s on v3, and the longest stretch with nothing to do from ~32 s to 8–11 s. This supports the v2/v3 hypothesis.
- Rushes still cost me sales on v3 (2, 12 and 3 missed), although every headless strategy serves them all: a human doesn't restock perfectly. run-8139, with its late first upgrade (66.4 s), missed the most and made the least.
- I moved from 6 Brews / 3 Crates (v1) to 7 / 2 (v3). My last upgrade still lands in the final minute every time.
- Small samples (2 and 3 runs); a reading, not a significance claim.
