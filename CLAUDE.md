# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Behavior
- **Surgical Edits:** Make the smallest possible changes to fix an issue. Do not rewrite whole files or unrelated code blocks.
- **Verification First:** Run tests immediately after modifications. Never assume a fix works until the CLI output confirms it.
- **Simplicity Over Architecture:** Prioritize explicit, straightforward code over complex abstractions or premature optimizations.
- **No Guessing:** Never assume requirements. If context is missing or ambiguous, ask for clarification immediately instead of guessing.
- **Surface Trade-offs:** When multiple valid patterns exist (e.g., performance vs. readability), present 2-3 concise options with their trade-offs before writing code.

## Build log (shared memory between sessions)

Nothing outside the repo persists between sessions, so `docs/buildlog.md` is the shared memory and the record of how the project was directed. The build-log skill (`/build-log`) has the full format. Voice: "I" is the developer; Claude Code is named in the third person.

1. **Start of every session:** before touching code, read the Open issues list at the top of Part 2 and the last session entry's "Where things stand / next step". That is the current state; do not rediscover it.
2. **During a session:** when I give a direction or correct the work, `/build-log note` it with my words quoted, so the wording survives a long session.
3. **End of every session:** append a session entry (Goal / Direction given / Course corrections / What was built / Decisions tagged [directed], [proposed → accepted] or [Claude's call] / What broke or was wrong / Hand edits / Testing notes / Learned / Where things stand / Showcase line). Update the Open issues list. If a decision changed, update Part 1 in the same session. Quote only words actually given; numbers come from commands run this session (`npm test`), not from memory.

## Stack and commands

Phaser 3 + Vite + TypeScript, Vitest for tests (`environment: 'node'`; economy tests never import Phaser). Spec: `docs/GDD-dungeon-counter-v4.md` (v1–v3 kept for provenance); execution plan: `docs/PLAN-dungeon-counter-v1.md`.

- `npm test`: run all tests once (`vitest run`).
- `npm run dev`: Vite dev server on port 6123 (`npm run dev -- --host` to reach it from a phone).
- `npm run build`: type-check (`tsc --noEmit`) and build static files to `dist/`.

## Layout

```
index.html            Vite entry; overlay root + canvas container
src/main.ts           Phaser.Game config
src/config/           EconomyConfig type, validation, challenge-v1.json (frozen), challenge-v2.json, selectConfig
src/economy/          pure TypeScript economy, policy and headless session runner (no Phaser imports)
src/storage/save.ts   per-config localStorage save
src/log/eventLog.ts   run_id / run_type / config_id wrapper around economy events
src/csv/export.ts     CSV string + download
src/scenes/           Phaser scenes (shop scene only; DOM overlay owns the UI)
src/ui/overlay.ts     HUD, buttons, reason text, pause menu, summary, save status
public/assets/        confirmed CC0 sprites (credited in CREDITS.md)
tests/                Vitest
balancing/            played CSVs, configs/baseline-v1.json (frozen idle-loop config, tag idle-loop-v1), summary.sql, run_sql.py (`uv run --with duckdb balancing/run_sql.py`), notes
```
