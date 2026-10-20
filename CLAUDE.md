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
3. **End of every session:** append a session entry (Goal / Direction given / Course corrections / What was built / Decisions tagged [directed], [proposed → accepted] or [Claude's call] / What broke or was wrong / Hand edits / Testing notes / Learned / Where things stand / Showcase line). Update the Open issues list. If a decision changed, update Part 1 in the same session. Quote only words actually given; numbers come from commands run this session (test command: none yet, see Open issues), not from memory.
