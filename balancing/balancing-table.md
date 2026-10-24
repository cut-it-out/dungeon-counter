# Balancing table — Dungeon Counter (S16)

*24 October 2026 · Sessions 10–11 (refreshed with my challenge-v4 runs) · data from `balancing/runs/`, `balancing/obsolete/idle-loop-runs/` and `balancing/simulated/`*

Every number below comes from `balancing/summary.sql` and traces to a `run_id`. To refresh after new runs:

```text
npm run simulate                                              # headless strategy CSVs for every config
uv run --with duckdb balancing/run_sql.py --idle --simulated --md   # all runs as one Markdown table
```

Played runs are mine (the developer's), free play on the challenge configs and the fixed policy on the idle loop. Headless runs are scripted strategies (`src/economy/policy.ts`), a model of perfect restocking, not players. "Idle" means no action was available; "action gap" is time between my restocks or upgrades (start and end count).

## 1. Configs side by side

| | baseline-v1 (idle loop) | challenge-v1 (frozen) | challenge-v2 | challenge-v3 (mine) | challenge-v4 | challenge-v5 (default) |
|---|---|---|---|---|---|---|
| Calm interval | 3 s, constant | 4 s, constant | 4 → 3.4 → 2.89 → 2.456 s | 4 → 2.8 → 1.96 → 1.372 s | 4 → 2.68 → 1.796 → 1.203 s | 4 → 2.68 → 1.796 → 1.203 s |
| `calmSpeedup` | — | — (1) | 0.85 | 0.7 | 0.67 | 0.67 |
| Rushes (60–80 / 150–175 / 240–270 s) | none | 1 / 0.75 / 0.6 s | 1 / 0.75 / 0.6 s | 1.2 / 0.8 / 0.65 s | 1.2 / 0.8 / 0.6 s | 1.2 / 0.7 / 0.5 s |
| Arrivals per day | 100 | 158 | 172 | 187 | 198 | 212 |
| Restock | 10c for 5, instant | 10c for 5, 5 s cooldown | same | same | same | same |
| Better Brews | 50c ×1.5, +2c | same | same | same | same | same |
| Bigger Crates | — | 40c ×1.5, +3 potions, max 3 | same | same | same | same |
| Score | closing balance | net profit | net profit | net profit | net profit | net profit + medal |
| Medals (bronze / silver / gold) | — | — | — | — | — | 900 / 1050 / 1200c |

## 2. Played runs

| run_id | config | profit | sold / missed | rushes served | restocks | Brews / Crates | first / last upgrade | idle | longest idle | mean / longest action gap | revenue min 2 → min 5 | reconciles |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| run-7355 | baseline-v1 | +182c | 100 / 0 | — | 20 | 5 / — | 31.2 / 258.4 s | 92.0 s | 14.6 s | 11.5 / 54.5 s | 164c → 301c | true |
| run-2ccd | baseline-v1 | +220c | 100 / 0 | — | 20 | 5 / — | 25.1 / 246.5 s | 21.0 s | 5.1 s | 11.5 / 18.2 s | 172c → 309c | true |
| run-849f | challenge-v1 | +384c | 156 / 2 | 20/20 33/33 49/50 | 15 | 6 / 3 | 25.5 / 260.6 s | 149.5 s | 33.5 s | 12.0 / 37.8 s | 200c → 876c | true |
| run-3f8a | challenge-v1 | +528c | 158 / 0 | 20/20 33/33 50/50 | 17 | 6 / 3 | 32.7 / 256.0 s | 171.3 s | 31.4 s | 11.1 / 32.0 s | 252c → 917c | true |
| run-dce4 | challenge-v3 | +563c | 185 / 2 | 15/16 30/31 46/46 | 20 | 7 / 2 | 32.5 / 263.7 s | 57.3 s | 7.5 s | 10.0 / 30.4 s | 236c → 1201c | true |
| run-8139 | challenge-v3 | +345c | 175 / 12 | 16/16 30/31 46/46 | 19 | 7 / 2 | 66.4 / 273.3 s | 45.1 s | 7.9 s | 10.3 / 49.0 s | 199c → 1151c | true |
| run-9f2e | challenge-v3 | +540c | 184 / 3 | 16/16 28/31 46/46 | 25 | 7 / 2 | 32.7 / 265.0 s | 51.8 s | 11.2 s | 8.6 / 26.6 s | 267c → 1193c | true |
| run-e321 | challenge-v4 | +776c | 196 / 2 | 16/16 31/31 50/50 | 21 | 7 / 2 | 32.5 / 258.8 s | 75.4 s | 10.1 s | 9.7 / 27.2 s | 236c → 1344c | true |
| run-b981 | challenge-v4 | +832c | 196 / 2 | 16/16 31/31 48/50 | 28 | 7 / 1 | 33.7 / 255.5 s | 48.5 s | 6.3 s | 8.1 / 27.4 s | 273c → 1318c | true |
| run-3556 | challenge-v5 | +1024c | 212 / 0 | 16/16 35/35 60/60 | 23 | 7 / 2 | 26.2 / 254.2 s | 57.2 s | 5.8 s | 9.1 / 28.1 s | 229c → 1540c | true |
| run-8391 | challenge-v5 | +1010c | 206 / 6 | 16/16 35/35 54/60 | 28 | 7 / 1 | 35.7 / 250.6 s | 41.5 s | 4.4 s | 8.1 / 31.4 s | 261c → 1440c | true |
| run-7ac0 | challenge-v5 | +918c | 212 / 0 | 16/16 35/35 60/60 | 19 | 7 / 3 | 40.5 / 257.4 s | 190.5 s | 24.1 s | 10.0 / 26.4 s | 245c → 1528c | true |

The idle-loop profit is closing − 20c start coins, the same definition as the challenge score (the idle loop itself showed the closing balance). No played runs on `challenge-v2`. run-7ac0 is my deliberate Crates-first run. Runs are listed in the order I played them.

## 3. Headless strategies (profit · missed)

| config | none | brews-only | crates-first | cheaper-first (mix) | brews-only lead over the best Crates strategy |
|---|---|---|---|---|---|
| challenge-v1 | 475c · 1 | **867c** · 1 | 694c · 0 | 803c · 0 | +64c |
| challenge-v2 | 520c · 2 | **1042c** · 2 | 801c · 0 | 975c · 0 | +67c |
| challenge-v3 | 565c · 0 | **1257c** · 0 | 986c · 0 | 1055c · 0 | +202c |
| challenge-v4 | 590c · 4 | 1118c · 4 | 1119c · 0 | **1210c** · 0 | −92c |
| challenge-v5 | 605c · 13 | 1199c · 13 | 1210c · 0 | **1410c** · 0 | −211c |

All strategies restock whenever the shelf won't cover the customers still to come and stop upgrading 60 s before the end. On v4 brews-only misses 4 customers in the 0.6 s last rush (46/50); the Crates strategies miss none.

## 4. Reading: what the data supports

1. **The idle loop had one outcome.** Both idle-loop runs sold 100/100, restocked 20 times and ended at Better Brews 5. It was rarely short of options (idle 92 s and 21 s: restocking was almost always possible), so its problem was not "nothing to do" but nothing *worth deciding*. That matches my playtest review that started the pivot.
2. **The challenge loop produces different outcomes from the same player.** Across seven challenge runs profit ranges from +345c to +832c and missed sales from 0 to 12. The lowest-profit run (run-8139) is the one with the late first upgrade (66.4 s) and the most missed customers. Decisions and execution show in the score.
3. **The calm speed-up fixed the slow stretches.** No action was available for 149.5 s and 171.3 s of the 300 s day on v1; on v3 it was 45.1–57.3 s and on v4 48.5–75.4 s. The longest stretch with nothing to do fell from 31–34 s to 6.3–11.2 s. The mean gap between my actions only moved from 11–12 s to 8.1–10.3 s: I wasn't acting much more often, I was waiting less.
4. **The rushes test execution, not just planning.** The headless strategies served every v3 rush customer; I missed 2, 12 and 3 on v3. On v4 I served the 0.6 s last rush 50/50 and 48/50, and missed 2 customers in each run.
5. **v4 raised my score mainly by adding customers.** My v4 runs made +776c and +832c, against +345c to +563c on v3. Against my best v3 run (run-dce4, +563c), run-e321 spent almost the same (1920c vs 1910c) and earned 223c more revenue: 11 more sales (196 vs 185, from the faster calm stretches) are worth about 147c of that at v3's 13.4c per sale, and a slightly higher revenue per sale (13.8c) the rest. So about two thirds of the gain is the config and one third is how I played, practice included (see Limits).
6. **The upgrade-choice hypothesis for v4 was not tested in play.** The headless model makes the Brews/Crates mix best on v4 (1210c, against 1118c for brews-only and 1119c for crates-first). I played both v4 runs the same Brews-heavy way as on v3 (Brews 7, Crates 2 and 1), with no pure-Brews and no Crates-3 run, so my runs can't confirm or reject it. Within v4, the run with fewer Crates made more (832c vs 776c), which two runs can't separate from noise. The model's gap between mix and pure Brews (92c, about 8%) is smaller than my own run-to-run spread (218c across the v3 runs), so a player can't feel it: the choice exists in the model, but I never had a reason to try a Crates-heavy day.
7. **I upgrade too late for the profit score.** My last upgrade came between 255.5 and 273.3 s in every challenge run, inside the last minute, where an upgrade can hardly pay for itself. That is a strategy lesson for me, and it may also be a UI question (nothing on screen says "too late to pay off").

## 5. Limits

- One player (me): 2 idle-loop runs, 2 runs on v1, 3 on v3, 2 on v4, none on v2. No statistical claim; these are readings.
- Learning effect: the runs are in the order I played them, and I got better with practice. Improvements from v1 to v3 to v4 mix the config changes with my own practice; reading 5 separates the two only roughly.
- The revisions change several numbers at once (v3 changed four), so a difference between configs can't be pinned on one parameter.
- Free play: my strategy changed between runs, deliberately.
- `elapsed_s` is rounded to 0.1 s in the CSVs, so idle times carry about ±0.1 s.
- Headless numbers depend on the strategies' rules (restock rule, 60 s upgrade horizon); they compare configs under one fixed model.

## 6. Conclusion (before v5)

`challenge-v4` does what the pivot set out to do: the day no longer stalls between rushes (reading 3), the rushes cost sales when I slip (reading 4), the score spreads with how I play and keeps improving with practice (readings 2 and 5), and in the headless model no single upgrade path wins (reading 6). What the data doesn't show is that the Brews/Crates choice matters to a human player: the model's difference is too small to feel. Claude Code read that as a question for a next iteration rather than a reason to hold v4 back; I chose to answer it now with one more revision (§7).

## 7. challenge-v5 (Session 11)

I chose one more revision instead of accepting v4. `challenge-v5` = v4 with rush 2 at 0.7 s and the last rush at 0.5 s, so skipping Bigger Crates shows up as missed rush customers: in the headless model brews-only serves the last rush 47/60 and makes 1199c, level with crates-first (1210c), while mixing both makes 1410c. Medals arrived with it (first bronze 700c, silver 850c, gold 1000c, set from my v4 runs; re-set to 900 / 1050 / 1200c after these runs).

My three v5 runs (§2):

1. **Skipping Crates now shows.** With one Crates level (run-8391) I served the last rush 54/60 and missed 6; with two or three (run-3556, run-7ac0) I served it 60/60.
2. **Crates first made the day boring, and the data agrees with how it felt.** In my deliberate Crates-first run (run-7ac0) no action was available for 190.5 s of the day, against 41.5 s and 57.2 s in the other two, and the longest stretch with nothing to do was 24.1 s (4.4–5.8 s). After rush 2, from 175 to 240 s, 59.3 s of those 65 s were blocked: Restock needed the shelf down to 6 potions for a 14-potion crate (Crates level 3), and the next Better Brews level cost 253c, then 380c. Across the day this "shelf too full for the crate" block made up about 150 s of the 190.5 s. My note while playing: "there was a time during the middle of the game (after 2nd rush) where I felt I could do very little other than restock and wait for money". The headless model had shown the same thing in its idle times (crates-first 223.3 s, cheaper-first 245.5 s, brews-only 108.2 s on v5), but we had compared only profits.
3. **The Crates-first day also earned the least** (+918c against +1010c and +1024c), although it ended with the most upgrades (Brews 7, Crates 3). In my hands a big crate costs more in waiting than it gains in rush sales.
4. **The medals are too easy.** Two of three first v5 runs reached gold (1000c) and the third silver. v5 has 14 more customers than v4 (212 vs 198), which lifted every score; the thresholds came from v4 runs.
5. **This is the Session 6 "Crates side effect" judged in play:** a 14-potion crate disables Restock from 7 to 20 potions, and with nothing affordable to buy, that reads as dead time, not as a trade-off.

Interactive view of the same data: the "Dungeon Counter balancing" dashboard (https://claude.ai/artifact/66FsFzuy6aTUkVfKdNKo7E, private to me unless I share it), fed by `balancing/summary-all.csv` (`run_sql.py --idle --simulated --csv`).
