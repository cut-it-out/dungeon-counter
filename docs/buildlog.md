# dungeon-counter — Build Log

Running record of how this project was built with Claude Code. "I" is the developer; Claude Code is named in the third person.

## Part 1 — Decisions locked so far

- Agent behavior: Claude Code makes surgical edits only, runs tests right after every change, prefers explicit code over abstractions, asks instead of guessing when requirements are unclear, and presents 2-3 options with trade-offs before writing code when several patterns are valid. The rules are in CLAUDE.md under "Agent Behavior" (directed, Session 1).
- Build log: `docs/buildlog.md` in the attributed voice. It is read at the start of every session and written at the end, as stated in CLAUDE.md (directed, Session 1).
- Game: a five-minute potion-stall idle sim for a fictional client (Pocket Lantern Games); brief in `docs/BRIEF_dungeon-counter-idle-sim.md`, palette in `docs/dungeon-counter-brand-palette.md`. The spec is `docs/GDD-dungeon-counter-v3.md`; v1 and v2 are kept for provenance (directed, Session 2).
- Stack & hosting: Phaser + Vite + TypeScript, Vitest for the economy; mobile portrait 390×844; Cloudflare Pages via Git integration; GitHub `cut-it-out/dungeon-counter` (proposed → accepted, Session 2).
- Economy: one product, one "Better Brews" upgrade (+price per level), fixed-batch restock, deterministic customer tick, 300 s of game time that pauses when hidden; pure TypeScript module driven by both Phaser and a full-session policy test (directed, Session 2).
- Baseline: `baseline-v1` numbers were proposed by Claude Code without simulation and are frozen; tuning goes in `revised-v1`. Provenance = this log's Session 2 + the unmodified v1 GDD in commit `94bf7af` (directed, Session 2).
- Dead-shop guard: an upgrade is blocked only when it would leave `stock == 0` and `coins < restockCost` (directed, Session 2).
- Execution plan: `docs/PLAN-dungeon-counter-v1.md` (S1–S18 + S5a), approved (directed, Session 3).
- UI rendering: Phaser draws only the shop scene; HUD, buttons, menus and summary are an HTML overlay in a CSS flex column (proposed → accepted, Session 3).
- Assets: Claude Code fetches and shortlists Kenney CC0 sprites; I confirm (directed, Session 3).
- Evidence: ≥1 (target 2) played runs per config with a shared manual policy; CSV with `run_id`/`run_type`; one SQL aggregation via DuckDB, run with `uv run --with duckdb balancing/run_sql.py` (directed, Session 3); idle time, action spacing, first-upgrade time, revenue/minute, surplus, missed sales as metrics; medals P2; simulator CLI P2 (directed, Session 2).
- Time box: ~3 days (18–24 h), one day over the brief; stated in the case study (directed, Session 2).

## Part 2 — Sessions

### Open issues

(Keep current; every session updates this list.)

- Execution not started (Session 3): `docs/PLAN-dungeon-counter-v1.md` is approved; start at S1. Follow its step order; each step's ✔ line is the check that closes it.
- No test command yet (Session 2): the stack is Vite + TypeScript + Vitest, but no scaffold exists. Plan S1 makes `npm test` green, then replaces "none yet" in CLAUDE.md's build-log block and adds the stack and commands to CLAUDE.md.
- Rank thresholds unvalidated (Session 2): `rankThresholds` in `baseline-v1` (500/1500/3000) are presentation values; Gold is provably unreachable (GDD §5). Medals are P2; set thresholds from played runs, don't edit the frozen baseline.
- Cloudflare Pages not connected (Session 2): I need to connect the GitHub repo in the Cloudflare dashboard once a build exists (build command and output dir come from the execution plan).
- CC0 asset selection pending (Session 2, method set in Session 3): plan step S5a: Claude Code fetches the Kenney packs, shortlists into `public/assets/candidates/`, I confirm; record each kept file in `CREDITS.md` with creator, pack, URL and licence.

### Session 1 — Tuesday 20 October 2026 — Project init: agent rules and build log

- **Goal:** set up the empty repo with working rules for Claude Code and a build log (my request).
- **Direction given:** I asked to "init this project with adding these:" and pasted five Agent Behavior rules (Surgical Edits, Verification First, Simplicity Over Architecture, No Guessing, Surface Trade-offs). Then I ran `/build-log init`.
- **Course corrections:** None.
- **What was built:** (1) `CLAUDE.md`: a standard header plus my Agent Behavior section, word for word. (2) `docs/buildlog.md`: this log. (3) A "Build log" section added to `CLAUDE.md` with the start/note/end routine.
- **Decisions:**
  - [directed] The Agent Behavior rules go in CLAUDE.md as written, so every session loads them.
  - [proposed → accepted] Attributed voice for the log. Claude Code recommended it for portfolio use; anonymous was the alternative.
  - [Claude's call] Log location `docs/buildlog.md`, the skill's default, since `docs/` already existed.
  - [Claude's call] No `/init` codebase section in CLAUDE.md yet. The repo had no code to document (only an empty `docs/` folder), so a section would have been guesswork.
- **What broke or was wrong:** None.
- **Hand edits:** None.
- **Testing / playtest notes:** None. There is no code or test setup yet.
- **Learned:** Writing the working rules down before any code exists means the first real session already runs under them.
- **Where things stand / next step:** Branch `main`, no commits. `CLAUDE.md` and `docs/buildlog.md` are uncommitted. Tests: none exist. Next step: define what dungeon-counter is, choose the tech stack and test command, and make the first commit.
- **Showcase line:** I started dungeon-counter from an empty repo by writing down how Claude Code should work (small edits, tests after every change, ask before guessing) and setting up a build log, so every later session follows the same rules and picks up where the last one stopped.

### Session 2 — Tuesday 20 October 2026 — Brief, git init and the GDD (v1 → v3)

- **Goal:** read the brief, finish the git setup and produce a Game Design Document for my review, as the first step before an execution plan (my request).
- **Direction given:** "lets build a game. please find the BRIEF in the docs. read it and ask questions." · "first lets create a game design document (GDD), which I will review, then based on that GDD we will create an execution plan." · "the game will be hosted on Cloudflare Pages and the code on is on GitHub (already have the repo setup), please finish initializing the git repo and lets go." · On art direction: "use the just added brand palette and ask questions if you still need directions". · After my review: "please rename the GDD.md to GDD-dungeon-counter-v1.md … review them and let me know if you would challange any change in it." · Then: "lets create the final v3 with your proposed review changes. for change 3 I would also go with option B."
- **Course corrections:** Claude Code's v1 GDD committed to "everything in sections 3–10" with a full simulator and several analytics outputs. I rewrote it by hand as v2 with P0/P1/P2 priorities, an upgrade solvency guard, exact scheduling rules, per-config saves, `run_id`/`run_type` CSV columns, medals moved to P2, the simulator made optional and the idle-gap metrics replaced with action-spacing proxies. Claude Code then challenged three of my v2 changes: (1) the idle-gap metrics *are* computable from the CSV rows, since every state change is a row; (2) the simulator is cheapest as a Vitest full-session policy test rather than a cut feature; (3) the always-on upgrade reserve was broader than the soft lock it fixed and would hide "going broke" in the baseline evidence. I accepted all three, choosing option B (narrow dead-shop guard) over A (keep the reserve) and C (no guard, log a `stuck` event).
- **What was built:** (1) `.gitignore`; first commit `d004bfa` pushed to `origin/main`. (2) `docs/GDD-dungeon-counter-v1.md`: Claude Code's draft, with the AI-proposed baseline economy, written before any calculation or play. (3) `docs/GDD-dungeon-counter-v2.md`: my hand-written review revision. (4) `docs/GDD-dungeon-counter-v3.md`: v2 plus the six accepted review changes, with a v2→v3 change log in section 14. All three committed as `94bf7af` (831 lines added).
- **Decisions:**
  - [proposed → accepted] Ranked summary at 5:00 with no fail state, rank from gross sales revenue; medals deferred to P2 until thresholds come from data. Alternatives: coin-goal win/lose; score only.
  - [proposed → accepted] The one upgrade ("Better Brews") raises the sale price per level. Alternatives: faster customers; cheaper restock.
  - [proposed → accepted] Claude Code proposes the `baseline-v1` numbers from intuition, labelled as AI-proposed, frozen before any play: start 20c/5 potions, shelf 20, restock 5 for 10c, sale 5c, customer every 3 s, upgrade 50c × 1.5^L for +2c. Alternatives: a separate fresh AI session; me picking them.
  - [proposed → accepted] Phaser + Vite + TypeScript + Vitest. Alternatives: plain JS; Phaser from CDN with no build.
  - [proposed → accepted] GDD as Markdown in `docs/`. Alternative: a Claude Doc.
  - [proposed → accepted] Cloudflare Pages Git integration for deploys. Alternative: GitHub Actions + Wrangler.
  - [directed] 3-day (18–24 h) time box instead of the brief's 2 days; the case study states the deviation (v2).
  - [directed] P0/P1/P2 priorities, fixed-batch restock with precise "Need 5 free slots" wording, per-config `localStorage` keys, `run_id`/`run_type` columns, a shared manual play policy for evidence runs (v2).
  - [directed] Dead-shop guard, option B: an upgrade is blocked only when it would leave `stock == 0` and `coins < restockCost`.
  - [proposed → accepted] Idle time and unspent surplus restored as primary metrics (computable from rows via `LEAD`); "action spacing" kept as the strategy-dependent proxy.
  - [proposed → accepted] The full-session policy test is P0; only a CSV-writing simulator CLI is P2.
  - [Claude's call] The Gold bound in GDD §5: revenue ≤ 100 × final price, so Gold needs level ≥ 13 (≈ 19,000c of upgrades); unreachable on the baseline. The frozen numbers are untouched.
- **What broke or was wrong:** v1 claimed the idle metrics were derivable; v2 said they weren't; v3 settles it with the mechanism (state is constant between rows). No code yet, so nothing broke.
- **Hand edits:** I added `docs/BRIEF_dungeon-counter-idle-sim.md` and `docs/dungeon-counter-brand-palette.md` before the session, and wrote `docs/GDD-dungeon-counter-v2.md` between turns.
- **Testing / playtest notes:** None. No code exists; tests not run.
- **Learned:** A reviewer's "not computable" claim is worth checking against the data model: when every state change is logged, piecewise-constant state makes interval metrics a window function, not a new data stream.
- **Where things stand / next step:** Branch `main` at `6412881` (this entry's commit), pushed to origin. Tests: none exist. GDD v3 is final. Next step: write the execution plan from GDD v3 (project scaffold, pure economy module + policy test, Phaser scenes, save/CSV, SQL + balancing, Pages deploy) for my review before any code.
- **Showcase line:** With only a fictional founder's email to go on, I had Claude Code draft a GDD with a frozen AI-proposed economy, rewrote it myself into a prioritised three-day spec, then let Claude Code challenge my revision and accepted the three changes that held up: the idle-time metric is computable after all, the simulator is a test not a feature, and the solvency guard should block only a true dead shop.

### Session 3 — Tuesday 20 October 2026 — Execution plan from GDD v3

- **Goal:** turn GDD v3 into an execution plan I can review before any code (my request, and Session 2's next step).
- **Direction given:** "then commit the v3 GDD and move to the execution planning phase. Once you have the plan please stop so I can review." · On the plan's open decisions: "1: duckdb with uv run and a tiny runner" · "2: what is the pro/con for this/that option?" · "3: you fetch and shortlist, I confirm/choose" · "once you answer/update the docs I'll still need to review" · "ok, thanks, lets go with Phaser scene + HTML overlay" · "looks ok, lets wrap this up and I'll ask you to execute from another session later".
- **Course corrections:** Claude Code recommended that I download the Kenney packs myself and it would shortlist by name; I asked for the reverse: Claude Code fetches and shortlists, I confirm or choose. On UI rendering I asked for the full pro/con before deciding rather than taking the recommendation as given.
- **What was built:** `docs/PLAN-dungeon-counter-v1.md`: 18 steps plus S5a over the GDD's three days, each with a P0/P1/P2 tag, files touched and a verification command; a repo layout; my five hands-on steps collected (S5a sprite confirmation, S10 phone smoke test, S11 Cloudflare dashboard, S12/S15 played evidence runs) with exact Pages settings (`npm run build`, output `dist`, `NODE_VERSION=24`); a list of known gotchas (frame-delta cap, integer-ms game time, Vitest in `node`, iOS share fallback, `.gitattributes`); a cut order; and a verification map from every GDD §11 acceptance check and every brief must-have to the step that closes it. No code written.
- **Decisions:**
  - [directed] SQL engine: DuckDB via `uv run --with duckdb` and a small `balancing/run_sql.py` runner. Rejected: DuckDB CLI binary (separate install); `@duckdb/node-api` (native binding, flaky on Windows).
  - [proposed → accepted] UI rendering: Phaser draws only the shop scene; HUD, buttons, reason text, pause menu and summary are an HTML overlay in a CSS flex column (HUD / canvas / controls), so the layers never overlap. Rejected: Phaser-only (tabular numerals, 48 CSS px targets and dialogs are all DOM-shaped); Phaser `DOMElement` (inherits canvas scale).
  - [directed] Sprites: Claude Code downloads the Kenney Roguelike/RPG and UI packs into their own directory, verifies the licence files and shortlists 8–10 into `public/assets/candidates/`; I confirm or swap (step S5a).
  - [Claude's call] `baseline-v1.json` gets its own commit in S2, before any Phaser work, so the provenance is one hash.
  - [Claude's call] Economy game time in integer ms anchored on `nextCustomerAt`; per-frame delta capped at 250 ms in addition to the hidden-tab pause.
  - [Claude's call] `revised-v1` becomes the public default only once marked accepted in `balancing/notes.md`.
- **What broke or was wrong:** Session 2's "Where things stand" line said `94bf7af` wasn't pushed; it was pushed right after. Claude Code corrected that line in place to name `6412881` as pushed.
- **Hand edits:** None.
- **Testing / playtest notes:** None. No code exists; tests not run.
- **Learned:** Asking for the trade-off table before choosing turned a vague "two render trees" con into a concrete layout fix (flex column, no overlap), which is what made the overlay the clear pick.
- **Where things stand / next step:** Branch `main`; this entry and `docs/PLAN-dungeon-counter-v1.md` are committed and pushed together with this wrap-up. Tests: none exist yet. GDD v3 and plan v1 are both approved. Next session: start the plan at **S1** (scaffold until `npm test` is green, add `.gitattributes`, update CLAUDE.md with the stack and commands), then S2 (freeze `baseline-v1` in its own commit).
- **Showcase line:** Before any code, I had Claude Code turn the final GDD into a step-by-step plan where every requirement maps to a verifiable step, decided the three open technical choices myself (DuckDB via uv, an HTML overlay on a Phaser scene, AI-fetched but human-picked CC0 sprites), and kept the playtests and deploy as my own hands-on steps.

### Session 4 — Tuesday 20 October 2026 — (in progress)

- [direction] "lets execute the plan. do the steps one-by-one after each other. once it is confirmed move to the next one. take notes of any deviation/questions on the way and let me know once you are done. stop only after you delivered day 1 (after S5a)." — start of plan execution, S1 → S5a.
- [decision] S1: Phaser pinned to 3.90.0 (latest 3.x) because the plan says "phaser 3.x"; npm latest is 4.2.1. TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.5. Vitest 5 hides console output from passing tests, so `silent: false` is set for the S4 policy line.
- [decision] S3: restock reports `need_slots` before `need_coins`; upgrade reports `need_coins` before `dead_shop_guard` (Claude's call).
- [decision] S4: policy restocks at `stock <= 1` (the literal `stock == 1` never restocks an emptied shelf) and checks restock before upgrade when both are possible (Claude's call; open question for the played runs).
- [finding] S4: the narrow dead-shop guard can still be beaten at stock 1: coins 52, upgrade 50c → 2c, last sale +7c → stock 0, coins 9. The policy test passes only because restock is checked first. Not changed; raised with me as a question.
- [decision] S5: the Phaser game is 390×400 design px (`SCENE_WIDTH`/`SCENE_HEIGHT` in `src/scenes/Play.ts`), FIT-scaled inside the middle flex box; 390×844 is the page, not the canvas (follows from decision B). Title/Summary scenes are thin routers; their content is DOM in `index.html` + `src/ui/overlay.ts`. Pause menu has Resume + Reset run (two-step confirm); Export CSV waits for S8, save status for S7 (Claude's call).
- [decision] S5: "Need Nc" shows the action's full cost (e.g. "Need 75c" for the upgrade), not the shortfall (Claude's call; open question).
- [decision] S5a: the Roguelike/RPG Pack has no characters, so Kenney's Roguelike Characters pack (CC0) was fetched as a third pack for the adventurer. Nothing shortlisted from the UI Pack (vector style; overlay is CSS). 13 candidates in `public/assets/candidates/`.
