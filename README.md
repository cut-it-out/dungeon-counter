# Dungeon Counter

A five-minute potion-shop game for mobile browsers. Restock before the customer rushes, choose between Better Brews (higher price) and Bigger Crates (more potions per restock), and beat your best profit for a medal. Built with Phaser 3, Vite and TypeScript as an AI-assisted portfolio prototype for a fictional client; see `docs/case-study-notes.md`.

## Run it

```text
npm install
npm run dev          # http://localhost:6123 (add -- --host to open it from a phone)
npm test             # all unit tests (Vitest)
npm run build        # type-check and build static files into dist/
```

On Windows, if `npm test` reports "no tests" with `Cannot read properties of undefined (reading 'config')`, the terminal's working directory has a lowercase drive letter: `cd` into the repo as `C:\...` and run it again.

## Configs

The economy numbers live in `src/config/*.json`. With no URL parameter the game plays the accepted config, `challenge-v5`.

| URL | Config |
|---|---|
| `/` or `?config=revised` | `challenge-v5` (accepted) |
| `?config=baseline` | `challenge-v1`, the frozen AI-proposed baseline |
| `?config=challenge-v2` … `challenge-v4` | earlier revisions |

The original idle-sim loop is the git tag `idle-loop-v1`.

## Balancing data

Every economic event is logged and can be exported as CSV from the pause menu or the summary. Played runs go in `balancing/runs/`.

```text
npm run simulate                                                   # headless strategy runs → balancing/simulated/
uv run --with duckdb balancing/run_sql.py                          # one summary row per played run
uv run --with duckdb balancing/run_sql.py --idle --simulated --md  # all runs as a Markdown table
```

The reading of the results is in `balancing/balancing-table.md`; config changes and their reasons in `balancing/notes.md`.

## Docs

- `docs/GDD-dungeon-counter-v4.md`: game design (v1–v3 kept for provenance)
- `docs/PLAN-dungeon-counter-v1.md`: execution plan
- `docs/buildlog.md`: session-by-session record of how the project was directed
- `docs/case-study-notes.md`: facts for the portfolio write-up
- `CREDITS.md`: CC0 art credits
