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
