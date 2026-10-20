# Dungeon Counter — Execution Plan (v1)

*Approved · 20 October 2026 · Built from `docs/GDD-dungeon-counter-v3.md`*

Each step names its priority (P0/P1/P2 from GDD §0), the files it touches, and the command whose output confirms it. Steps marked **[you]** are the developer's: Claude Code can't do them. Execution starts at S1.

## 0. Decision points

### A. SQL engine — **decided: DuckDB via `uv run --with duckdb` with a tiny Python runner** (directed)

`balancing/run_sql.py` reads `balancing/summary.sql`, points DuckDB at `balancing/runs/*.csv` and prints the result table. Rejected: the DuckDB CLI binary (a separate install to document) and `@duckdb/node-api` (native binding, flaky on Windows).

### B. In-game UI rendering — **decided: Phaser scene + HTML overlay, flex-column layout** (proposed → accepted)

The brief fixes Phaser; this decided only what draws the numbers, buttons and menus. The comparison that informed it:

| | **1. Phaser scene + HTML overlay (recommended)** | **2. Phaser-only** |
|---|---|---|
| Text | DOM text is crisp at any scale; `system-ui` + `tabular-nums` work natively, so changing counts never shift the layout | `Text` is a canvas texture; soft at non-integer Scale.FIT factors unless `resolution`/DPR is managed; tabular digits need a monospace font or manual placement; font stack must be explicit |
| Touch targets | Sized in CSS px: "≥ 48 px" is a stylesheet rule, independent of canvas scale | Sized in design px; 56 design px can become ~40 CSS px on a small phone, so every size is checked on device |
| Buttons, disabled states, reason text, pause menu, confirms, summary | Native `<button disabled>`, flexbox, wrapping text | Hand-rolled from `Graphics` + `Text` + hit zones; manual word wrap; the largest and buggiest chunk of code in the project |
| Accessibility | Real buttons: focus, labels, screen readers | None without extra work |
| Palette / safe areas | CSS variables from the brand doc; `env(safe-area-inset-bottom)` | Hex constants (fine); safe-area insets read from CSS into JS |
| Motion | CSS transitions for popups; Phaser tweens for the scene | One tween system for everything |
| Coordinate systems | Two, **but avoidable**: lay the page out as a CSS flex column HUD / canvas / controls. The canvas is then only the shop scene, FIT-scaled inside its own box; nothing overlaps, no alignment code, no pointer-event conflicts | One; the 390×844 design canvas is what you see, full-screen vignette included |
| Code volume | Phaser part small (shelf, adventurer cue, `+Nc`); DOM does the rest | Everything in one scene graph; cleaner "built in Phaser" story |
| Tests | Overlay is plain DOM (jsdom-testable if wanted) | UI by hand only |

Phaser `DOMElement` objects (DOM inside the scale manager) were ruled out: they inherit the canvas scale, so touch sizes scale again. Option 2 (Phaser-only) was rejected because the GDD's hard UI requirements (tabular numerals, 48 CSS px targets after scaling, reason text, truthful save status, confirm dialogs) are all DOM-shaped.

### C. CC0 sprites — **decided: Claude Code fetches the Kenney packs and shortlists; you confirm or choose** (directed)

Becomes step S5a. The zips are downloaded into their own directory (untrusted input, never run tooling from inside it); the shortlist is copied into `public/assets/candidates/` so you can view it in the IDE; rejected files are deleted before S17.

## 1. Repo layout

```
index.html                 Vite entry; overlay root + canvas container
src/main.ts                Phaser.Game config (390×844, Scale.FIT, CENTER_BOTH, Ink background)
src/config/
  types.ts                 EconomyConfig interface
  validate.ts              GDD §4 validation list; throws with a readable message
  baseline-v1.json         frozen (GDD §5); never edited after commit
  revised-v1.json          added on Day 3
  index.ts                 selectConfig(search: string) → ?config= handling + default rule
src/economy/               pure TypeScript, zero Phaser imports
  types.ts                 EconomyState, EconomyEvent (= one CSV row minus run columns)
  economy.ts               createState, advanceTo, restock, upgrade, canRestock, canUpgrade, priceAt, upgradeCostAt
  policy.ts                GDD §6 manual policy as a function of state
  runSession.ts            headless runner: policy × economy for sessionSeconds
src/storage/save.ts        per-config localStorage key, schemaVersion, best-effort
src/log/eventLog.ts        run_id / run_type / config_id wrapper around economy events
src/csv/export.ts          toCsv(rows) + download(filename)
src/scenes/                Boot, Title, Play, Summary (Pause lives in the overlay)
src/ui/overlay.ts          HUD, buttons, reason text, pause menu, save status
public/assets/             the chosen CC0 sprites
tests/                     Vitest; `environment: node`
balancing/
  runs/                    exported CSVs (played; simulated in a subfolder if P2 happens)
  summary.sql              the one aggregation (GDD §6 metrics)
  run_sql.py               uv runner (decision A)
  notes.md                 play-policy deviations, hypothesis for revised-v1
  balancing-table.md       baseline vs revised (GDD §10 step 6)
CREDITS.md
docs/case-study-notes.md   AI disclosure, time-box deviation, what was actually tested
```

## 2. Steps

### Day 1 — game loop (P0, ~7 h)

**S1. Scaffold until `npm test` is green.** P0
`package.json` (vite, typescript, phaser 3.x, vitest), `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` (`environment: 'node'`), `.gitattributes` (`* text=auto eol=lf`, stops the CRLF warnings and keeps CSV/JSON line endings stable), `index.html`, `src/main.ts` with an empty scene, `tests/smoke.test.ts`.
Then update `CLAUDE.md`: stack, `npm test` / `npm run dev` / `npm run build`, the layout above; replace "test command: none yet" in the build-log block.
✔ `npm test` → `1 passed`; `npm run build` → `dist/index.html` exists. Commit.

**S2. Freeze `baseline-v1`.** P0
`src/config/types.ts`, `src/config/baseline-v1.json` with exactly the GDD §5 values, `src/config/validate.ts` (positive integer costs/quantities, `restockBatch <= shelfCap`, positive interval and session length, `0 <= startStock <= shelfCap`, `startCoins >= restockCost`, `salePrice − restockCost/restockBatch > 0`), `tests/config.test.ts` (baseline validates; one failing case per rule).
✔ `npm test` → config tests pass. **Separate commit** "Freeze baseline-v1" so the provenance is one hash.

**S3. Pure economy module.** P0
`src/economy/types.ts`, `src/economy/economy.ts`. Game time in **integer ms**; arrivals anchored on `nextCustomerAt` (no float drift on the 3 s grid). `advanceTo(state, cfg, tMs)` processes every due arrival in order up to `min(tMs, sessionMs)`, emits the arrival due at exactly `sessionMs` **before** `session_end`, then marks `finished`; all actions are no-ops after `finished`. `canRestock` / `canUpgrade` return `{ ok, reason }` with reasons `need_coins | need_slots | dead_shop_guard`. Dead-shop guard exactly as GDD §4: block only if `stock == 0 && coins − upgradeCostAt(level) < restockCost`.
`tests/economy.test.ts`: 100 arrivals at 3…300 s; arrival at 300 precedes `session_end`; one huge `advanceTo` yields the same log as 300 one-second steps; input ignored after end; restock blocked at 16/20 with reason `need_slots`; guard blocks at `stock 0, coins 55, cost 50` and allows at `stock 1, coins 55`; `priceAt`/`upgradeCostAt` formulas; missed sale at stock 0.
✔ `npm test` → all economy tests pass.

**S4. Full-session policy test.** P0
`src/economy/policy.ts` (restock when `stock == 1` and affordable; upgrade as soon as the guard allows; else wait), `src/economy/runSession.ts`, `tests/policy-session.test.ts`: runs every config in `src/config/*.json`, asserts `end.coins == startCoins + Σ amount`, `Σ sale amount == revenue`, 100 arrivals, no `dead_shop` state ever, and logs first-upgrade time, idle time, missed sales and closing balance per config.
✔ `npm test` prints a line like `baseline-v1: first upgrade 48s, idle 0s, missed 3, close 212c` (numbers are whatever they turn out to be; not evidence).

**S5. Phaser shell + overlay.** P0 (decision B)
`src/scenes/{Boot,Title,Play,Summary}.ts`, `src/ui/overlay.ts`, palette as CSS variables from the brand doc. Play scene: static background, shelf showing `stock` potion icons, adventurer cue + `+Nc` / "Out of stock" feedback. Clock: per-frame delta **capped at 250 ms** before it is fed to `advanceTo`, so a hidden tab can't dump minutes of game time on refocus; `visibilitychange` → hidden pauses. Buttons show cost and, when disabled, the reason text ("Need 10c", "Need 5 free slots", "Keep 10c for stock"). Summary shows revenue, restock spend, upgrade spend, sold, missed, level, closing balance. No medals yet.
✔ `npm run dev`, Chrome device mode 390×844: a full 5:00 session reaches Summary; counters match the console event log. `npm test` still green. S5 starts with coloured placeholder rectangles; sprites arrive in S5a.

**S5a. Fetch and shortlist CC0 sprites.** P0 (decision C) **[you confirm]**
Download the Kenney Roguelike/RPG Pack and UI Pack (CC0) into a fresh directory outside the source tree; verify the licence file in each zip. Shortlist ~8–10 files (stone floor/wall tiles, a counter or table, 2–3 potion bottles, one or two adventurers, optionally a panel/button frame) into `public/assets/candidates/` with a short list of what each is for. You confirm or swap; the rest are deleted. Record creator, pack, URL and licence per kept file straight into `CREDITS.md`.
✔ `public/assets/` holds only confirmed files; each has a `CREDITS.md` line.

### Day 2 — robustness & evidence (P1, ~7 h)

**S6. Event log wrapper.** P1
`src/log/eventLog.ts`: adds `run_id` (`run-` + 4 hex), `run_type: 'played'`, `config_id`; `session_start` row with starting state and `amount 0`; `resume` row on load.
`tests/eventLog.test.ts`: header order is exactly `run_id,run_type,config_id,elapsed_s,event,amount,coins,stock,upgrade_level,price`.
✔ `npm test`.

**S7. Save / resume.** P1
`src/storage/save.ts`: key `dungeon-counter-save:v1:<configId>`; `{ schemaVersion, configId, runId, coins, stock, upgradeLevel, elapsedMs, nextCustomerAt, finished, events[] }`; save after every event, on hidden, on `pagehide`; every read/write in try/catch; status label `Saved` / `Not saved` driven by the actual result. Title: `Continue` if an unfinished save exists, `Last summary / Export` if a finished one does; `New day` and `Reset` confirm when a log would be replaced. Malformed save → notice + fresh run.
`tests/save.test.ts`: round-trip; malformed JSON → `null`; storage throwing → `Not saved`, game continues.
✔ `npm test`; in the browser: refresh at 2:10 resumes at 2:10 with the same coins/stock; switching tabs for 60 s doesn't move the clock; a finished run survives refresh and still exports.

**S8. CSV export.** P1
`src/csv/export.ts`: `toCsv(rows)`, filename `dungeon-counter_<config_id>_played_<YYYYMMDD-HHMM>.csv`, Blob + anchor download, `navigator.share({ files })` fallback when `canShare` says so (iOS Safari).
`tests/csv.test.ts`: fixture rows → exact string; reconciliation on the fixture.
✔ `npm test`; desktop download opens in a spreadsheet with the 10 columns.

**S9. Config selection.** P1
`src/config/index.ts`: `?config=baseline|revised`; default = baseline until `revised-v1.json` exists **and** is marked accepted in `balancing/notes.md`; the active id in the pause menu and in every CSV row.
✔ `?config=baseline` and `?config=revised` (once it exists) load different saves and print their id.

**S10. Phone smoke test.** P1 **[you]**
On your phone over `npm run dev --host` (or after S11): buttons ≥ 48 CSS px, text legible, a full session completes, refresh resumes, CSV export produces a file you can open or share. Note anything off in `balancing/notes.md`; I fix it.

### Day 3 — tuning & portfolio (~8 h)

**S11. Deploy to Cloudflare Pages.** P1 **[you]** for the dashboard part
I add nothing special; Vite's `dist/` is static. In the Cloudflare dashboard: Workers & Pages → Create → Pages → connect `cut-it-out/dungeon-counter`, production branch `main`, build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION=24`. Every push to `main` deploys; branches get preview URLs.
✔ The Pages URL loads on your phone; `?config=baseline` works there.

**S12. Baseline evidence runs.** P1 **[you]**
≥ 1, target 2, complete played sessions on `?config=baseline`, following the §6 policy (restock at stock 1 if affordable; upgrade as soon as allowed; otherwise wait). Export each CSV into `balancing/runs/`. Note deviations in `balancing/notes.md`.
✔ Files in `balancing/runs/` whose `run_id`s differ and whose last row is `session_end`.

**S13. SQL aggregation.** P1 (decision A)
`balancing/summary.sql`: one query over `read_csv_auto('balancing/runs/*.csv')`, grouped by `run_id, config_id, run_type`: first-upgrade time, idle time (`LEAD(elapsed_s)` × availability `CASE` from row state and config constants), longest idle stretch, action spacing, upgrade spacing, revenue in minute 2 vs 5, time-weighted surplus, missed sales, revenue, restock spend, upgrade spend, closing balance, reconciliation check. `balancing/run_sql.py` + `README` line: `uv run --with duckdb balancing/run_sql.py`.
✔ The command prints one row per run; `closing == start + Σ amount` is `true` for every run.

**S14. `revised-v1`.** P1
From the S13 numbers, one headline change (or one tightly justified set). `src/config/revised-v1.json`, hypothesis + old/new values in `balancing/notes.md`. The policy test (S4) runs it automatically for a sanity check, labelled as such.
✔ `npm test` green on both configs; commit.

**S15. Revised evidence runs.** P1 **[you]**
Same as S12 on `?config=revised`. Then I re-run S13.

**S16. Balancing table + interpretation.** P1
`balancing/balancing-table.md`: parameters side by side, first-upgrade time, idle time, revenue, closing balance, missed sales per run, and a written reading that says what the data supports, including "baseline wasn't flawed" or "revised wasn't better" if that's what it shows. Chart only if time remains.
✔ Every number in the table traces to a `run_id` in `balancing/runs/`.

**S17. Credits, disclosure, docs.** P1
`CREDITS.md` checked against `public/assets/` (started in S5a), `docs/case-study-notes.md` (fictional client; AI role = code assistance + proposed baseline; human-made CC0 art; 3-day vs 2-day box; what was actually tested), README with the commands.
✔ Every file in `public/assets/` appears in `CREDITS.md`.

**S18. P2, only after S16.**
Medals from played thresholds → tiny adventurer animation → `scripts/simulate.ts` (wraps `runSession`, writes `run_type=simulated` CSVs into `balancing/runs/simulated/`) → before/after chart. Cut in reverse order if time slips.

## 3. Your steps, collected

S5a sprite confirmation · S10 phone smoke test · S11 Cloudflare dashboard setup · S12 and S15 played evidence runs. Policy-test output never substitutes for S12/S15.

## 4. Things I'll get right from the start

- Economy tests never import Phaser; Vitest runs in `node`.
- Per-frame delta capped (S5) **and** hidden-tab pause: both, because `requestAnimationFrame` can resume with a huge delta.
- Integer ms everywhere in the economy; `elapsed_s` is derived at CSV time with one decimal.
- `session_start` and `resume` rows carry full state, so the idle-time window query needs no special cases.
- Save writes are synchronous and wrapped; the "Saved" label follows the real outcome.
- `.gitattributes` before the first CSV lands.
- Downloaded asset zips stay in a directory of their own (never run tooling from inside it).

## 5. Cut order if time slips

Medals → animation → simulator CLI → chart. Never: the core loop, played CSV evidence, one before/after comparison, truthful credits.

## 6. Verification map

| GDD §11 acceptance check | Closed by |
|---|---|
| Full session in a mobile browser, no keyboard | S5, S10 |
| Arrivals processed exactly once; hide/refresh don't advance or replay | S3 tests, S5 cap, S7 browser check |
| Restock obeys capacity/affordability; upgrade never creates a dead shop | S3 tests (guard), S4 (`no dead_shop` assertion) |
| `npm test` passes incl. policy test on both configs | S4, S14 |
| Save/resume on a phone; storage failure visible and graceful | S7, S10 |
| CSV reconciles: `start + Σ amount = final`; `Σ sale = revenue` | S8 test, S13 query |
| ≥ 1 baseline and revised played run, change documented, SQL executable, honest reading | S12–S16 |
| CC0 licences checked per file, in `CREDITS.md`, no AI images | S5a, S17 |
| Disclosure: fictional client / AI-assisted / human CC0 / actual testing | S17 |

| Brief must-have | Step |
|---|---|
| One product, one screen, one upgrade, counters, 5-min timer, no pathfinding | S3, S5 |
| Deterministic tick, restock/upgrade buttons, summary state | S3, S5 |
| Auto-save, pause while closed, no offline earnings | S5, S7 |
| Readable config; AI baseline and revision kept apart | S2, S14 |
| Event log + Export CSV, no remote analytics | S6, S8 |
| Balancing sheet with first-upgrade timing, progression, one change | S16 |
| One SQL aggregation in the repo | S13 |
| `CREDITS.md` | S17 |
| Reset action; no identifying fields | S7, S6 |
