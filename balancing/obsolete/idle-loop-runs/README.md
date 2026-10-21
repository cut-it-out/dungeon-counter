# OBSOLETE: idle-loop runs (baseline-v1)

Not current evidence. These are played runs of the idle-sim loop that was replaced by the shop-challenge loop in Session 6 (build log; GDD v4 §16). They are kept only as the before-evidence for that design pivot.

- run-7355 and run-2ccd: `baseline-v1`, fixed play policy, 100 sold / 0 missed, 20 restocks, Better Brews 5, closing 202c and 240c.
- Config: `balancing/configs/baseline-v1.json`. Playable build: git tag `idle-loop-v1`.
- They sit outside `balancing/runs/` on purpose: the SQL and data reports read `balancing/runs/*.csv` only. Don't move them back. Read them explicitly when comparing the idle loop with the challenge loop (GDD v4 §10 step 7). They have no `crate_level` column.
