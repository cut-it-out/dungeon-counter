# The brief — Dungeon Counter

*Fictional client exercise. The client message is invented; the scope is a proposed self-directed prototype, not an approved commission.*

## Client input

> **Subject: Could you prototype our shop idea?**
>
> Hi, I'm **Nico** from **Pocket Lantern Games**. We're thinking about a tiny fantasy shop game where adventurers buy supplies and you slowly grow the business. Something fun in five minutes, not a massive tycoon game. We tried an AI-assisted mock-up, but the upgrade prices felt random: sometimes you had nothing to do, then suddenly money came too easily. Could you build a browser version and help us see if the numbers are right? We don't need finished art yet.
>
> Cheers, **Nico**, founder

**Source:** Simulated founder email; undated.

**Client / product:** Pocket Lantern Games (fictional) / small management-idle prototype.

**What they want:** A five-minute shop loop and an explanation of unconvincing upgrade economics.

**Who it's for:** Casual management/idle players.

**Where it will run:** Browser; mobile portrait is the prototype assumption.

**Deadline / budget:** Unspecified.

**References:** Mentions an AI-assisted mock-up, but provides no files or figures.

**Materials provided:** None.

**Who approves:** Nico, provisionally (fictional).

## Scoped brief

**Goal (one sentence, measurable):** Deliver a working five-minute shop sim whose AI-suggested starting values can be compared against a revised economy using actual local CSV event logs and a concise balancing sheet.

**Target player:** A casual player checking an idle-management game on a phone for around five minutes.

**Platform & orientation:** **Phaser / HTML5**, **mobile portrait**, browser-playable with no install/server; same-device `localStorage` save only.

**Core loop (one sentence):** Buy a small potion restock, let arriving adventurers purchase stock automatically, accumulate coins and invest in one repeatable profit upgrade.

### Must-haves

- **One product (potions), one shop screen, one upgrade track**, coin/stock counters and a five-minute play-session timer; no animated customer pathfinding.
- Deterministic customer arrival tick; simple restock and upgrade buttons; win/summary state after five minutes.
- Auto-save current coins, stock, upgrade level and remaining session state to `localStorage`; play time **pauses while closed** (no offline earnings).
- Readable economy constants in a small JSON/JS config (restock cost, sale value, customer interval, upgrade cost/effect); keep an **AI-proposed baseline** and a tested revision separately.
- Client-side event log for purchases, sales and upgrades (elapsed seconds, event type, coin balance); **Export CSV** button; no remote analytics.
- **One balancing sheet** (CSV or spreadsheet) showing baseline/revised parameters, first-upgrade timing, coin progression and the reasoning for one change; a simple before/after table or chart generated from real runs.
- One small SQL aggregation query in the repository or case study showing how exported events were summarised; Qlik is **not required** for the two-day version.
- Asset credits in `CREDITS.md` and the case study.

### Nice-to-haves

- A second balancing iteration and a tiny dashboard **after** all mandatory evidence is finished.

### Out of scope

- Two-product economy, multiple shops, equipment/crafting trees, customer AI, offline gains, cloud save, servers and production analytics.
- Telemetry dashboards, account systems, monetisation, AI-generated artwork and full game-art production.

### Success criteria

- The complete five-minute loop works and save/resume survives a browser refresh on the tested device.
- A downloaded CSV can be checked against visible game events; a baseline and tuned run are captured, with **at least two runs per version if time allows**.
- The write-up presents actual exported data plus a balancing sheet and explains **one measured change**. If the baseline is not demonstrably flawed, report that result; do not manufacture an “AI failure.”
- Used art is CC0-verified and credited.

### Time box

**Approximately 2 focused working days (AI-assisted development, ~8-16 hours):** Day 1 -> AI-proposed baseline/config and functional one-product economy, save/resume, event log, CSV export and UI; Day 2 -> replay baseline/tuned configs, balancing sheet + short SQL summary, QA/deploy and capture. If behind, omit charts/dashboards and deep polish, **not CSV evidence or balancing documentation**.

### Asset constraints

**Reuse verified CC0 icons and panels; no AI-created art.** Proposed source: [Kenney Roguelike/RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) (CC0), optionally [Kenney UI Pack](https://kenney.nl/assets/ui-pack) (CC0); select only a few coherent potion/shop/UI sprites. OpenGameArt substitutions must be independently checked for CC0 at the item level. Record the exact assets actually used with creator, pack name, URL and licence in `CREDITS.md` and the case study.

### Legal & privacy

No users/accounts, external telemetry or identifying event fields; save and CSV remain on the player's device until explicitly exported. Provide a reset action. Record AI's actual role (code assistance and proposed economy parameters) separately from human-made CC0 visuals.

### Assumptions and open questions

- **Scope choice:** One product/upgrade, paused-clock saving and a lightweight balancing comparison preserve systems thinking without full simulation complexity.
- **Truth-in-case-study:** The fictional client mock-up is not available; use an openly labelled, newly AI-proposed starting config rather than presenting it as client-provided data.
- **Evidence rule:** An “AI balance was off, then I fixed it” claim must be backed by real exported runs and before/after numbers; otherwise describe a tuning experiment.
- **Unresolved fictional-client inputs:** Which five-minute outcome is satisfying? What is the precise business model and art direction?
