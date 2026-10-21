# Balancing notes

Played runs, deviations and config changes, newest last. Numbers come from the CSVs in `balancing/runs/` or from `npm test` output; headless strategy numbers are sanity checks, not evidence.

## Played runs

| run_id | config | date | notes |
|---|---|---|---|
| run-7355 | baseline-v1 (idle loop, **obsolete**) | 21 Oct 2026 | In `obsolete/idle-loop-runs/`, outside the SQL. Fixed policy. 100 sold / 0 missed, 20 restocks, Brews 5, closing 202c. Before-evidence for the pivot. |
| run-2ccd | baseline-v1 (idle loop, **obsolete**) | 21 Oct 2026 | In `obsolete/idle-loop-runs/`, outside the SQL. Fixed policy. 100 sold / 0 missed, 20 restocks, Brews 5, closing 240c. Before-evidence for the pivot. |
| run-849f | challenge-v1 | 21 Oct 2026 | Free play. 156 sold / 2 missed, 15 restocks, Brews 6, Crates 3, closing 404c (profit +384c). |

## challenge-v2 (Session 8)

- **Change:** `calmSpeedup` absent (= 1, calm every 4 s all day) → **0.85** (calm stretches every 4 s → 3.4 s → 2.89 s → 2.456 s). Everything else equals `challenge-v1`.
- **Why:** my play of `challenge-v1`: "the game between the rush sections feels slow".
- **Hypothesis:** shorter calm gaps later in the day keep me acting between rushes (more sales and decisions per minute in calm stretches 2–4) without changing the rushes themselves. Expected in played runs: shorter action spacing and less idle time after 80 s, higher profit; missed sales in rushes about the same.
- **Not expected to fix:** the Better Brews dominance seen in the headless strategies.
- **Headless sanity check (`npm test`, Session 8, not evidence):** profit `challenge-v1` → `challenge-v2`: none 475c → 520c, brews-only 867c → 1042c, crates-first 694c → 801c, cheaper-first 803c → 975c. Arrivals 158 → 172. Brews still dominates.
- **Status:** not accepted; `REVISED_ACCEPTED` stays `false` until played runs on `?config=revised` support it.
