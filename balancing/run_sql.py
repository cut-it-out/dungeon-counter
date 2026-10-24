"""Run balancing/summary.sql with DuckDB and print one block per run (plan S13).

Usage, from the repo root:
    uv run --with duckdb balancing/run_sql.py                # played runs: balancing/runs/*.csv
    uv run --with duckdb balancing/run_sql.py --idle         # + idle-loop runs (balancing/obsolete/)
    uv run --with duckdb balancing/run_sql.py --simulated    # + headless strategy runs (balancing/simulated/)
    uv run --with duckdb balancing/run_sql.py <glob> ...     # other CSVs instead
Output: --csv for CSV, --md for a Markdown table; one block per run otherwise.
Refresh the headless runs first with `node scripts/simulate.mjs`.
"""

import sys
from pathlib import Path

import duckdb

RUNS_GLOB = "balancing/runs/*.csv"
SOURCES = {"--idle": "balancing/obsolete/idle-loop-runs/*.csv", "--simulated": "balancing/simulated/*.csv"}
FORMATS = {"--csv", "--md"}


def main() -> None:
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    globs = [a.replace("\\", "/") for a in sys.argv[1:] if not a.startswith("--")]
    if not globs:
        globs = [RUNS_GLOB] + [SOURCES[f] for f in SOURCES if f in flags]
    unknown = flags - FORMATS - set(SOURCES)
    if unknown:
        sys.exit(f"unknown option(s): {', '.join(sorted(unknown))}")

    sql = (Path(__file__).parent / "summary.sql").read_text(encoding="utf-8")
    sql = sql.replace(f"'{RUNS_GLOB}'", "[" + ", ".join(f"'{g}'" for g in globs) + "]")
    result = duckdb.sql(sql)
    columns = result.columns
    rows = result.fetchall()
    cell = lambda v: "" if v is None else str(v)

    if "--csv" in flags:
        print(",".join(columns))
        for row in rows:
            print(",".join(cell(v) for v in row))
        return
    if "--md" in flags:
        print("| " + " | ".join(columns) + " |")
        print("|" + "---|" * len(columns))
        for row in rows:
            print("| " + " | ".join(cell(v) for v in row) + " |")
        return

    width = max(len(c) for c in columns)
    for row in rows:
        for name, value in zip(columns, row):
            print(f"{name:<{width}}  {cell(value)}")
        print()
    print(f"{len(rows)} run(s); reconciles for all: {all(dict(zip(columns, r))['reconciles'] for r in rows)}")


if __name__ == "__main__":
    main()
