# dungeon-counter — Build Log

Running record of how this project was built with Claude Code. "I" is the developer; Claude Code is named in the third person.

## Part 1 — Decisions locked so far

- Agent behavior: Claude Code makes surgical edits only, runs tests right after every change, prefers explicit code over abstractions, asks instead of guessing when requirements are unclear, and presents 2-3 options with trade-offs before writing code when several patterns are valid. The rules are in CLAUDE.md under "Agent Behavior" (directed, Session 1).
- Build log: `docs/buildlog.md` in the attributed voice. It is read at the start of every session and written at the end, as stated in CLAUDE.md (directed, Session 1).

## Part 2 — Sessions

### Open issues

(Keep current; every session updates this list.)

- Project scope undefined (Session 1): the repo has no README, code or description of what dungeon-counter is. Before any code: decide what it does, the tech stack and the test command, then add them to CLAUDE.md and Part 1.
- No test command (Session 1): the "Verification First" rule in CLAUDE.md can't be followed until a test setup exists. Pick one together with the tech stack.
- Nothing committed yet (Session 1): `main` has no commits. CLAUDE.md and this log are uncommitted.

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
