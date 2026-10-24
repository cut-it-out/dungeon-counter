"""Run balancing/summary.sql with DuckDB and print one block per run (plan S13).

Usage, from the repo root:
    uv run --with duckdb balancing/run_sql.py                 # balancing/runs/*.csv
    uv run --with duckdb balancing/run_sql.py <glob> [--csv]  # other CSVs; --csv prints CSV instead
"""

import sys
from pathlib import Path

import duckdb

RUNS_GLOB = "balancing/runs/*.csv"


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--csv"]
    sql = (Path(__file__).parent / "summary.sql").read_text(encoding="utf-8")
    if args:
        sql = sql.replace(RUNS_GLOB, args[0].replace("\\", "/"))
    result = duckdb.sql(sql)
    columns = result.columns
    rows = result.fetchall()

    if "--csv" in sys.argv:
        print(",".join(columns))
        for row in rows:
            print(",".join("" if v is None else str(v) for v in row))
        return

    width = max(len(c) for c in columns)
    for row in rows:
        for name, value in zip(columns, row):
            print(f"{name:<{width}}  {'' if value is None else value}")
        print()
    print(f"{len(rows)} run(s); reconciles for all: {all(dict(zip(columns, r))['reconciles'] for r in rows)}")


if __name__ == "__main__":
    main()
