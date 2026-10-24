-- S13 balancing summary (plan S13, GDD v4 §6). One row per run in balancing/runs/*.csv.
-- Run from the repo root: uv run --with duckdb balancing/run_sql.py
-- Config constants come from src/config/*.json, joined on config_id. The idle-loop runs in
-- balancing/obsolete/ are outside the glob on purpose.
--
-- State is constant between rows (every coin or stock change is a row), so availability over
-- the gap to the next row follows from the row's state and the config, except for the restock
-- cooldown, which ends between rows: those gaps are split at ready_at = latest restock + cooldown.
-- elapsed_s is rounded to 0.1 s in the CSV, so cooldown ends and 0.75 s rush arrivals carry up to
-- 0.05 s of rounding.

WITH cfg AS (
  SELECT * FROM read_json_auto('src/config/*.json', union_by_name = true)
),
raw AS (
  -- seq keeps file order: a sale, a restock and session_end can share one elapsed_s.
  SELECT row_number() OVER () AS seq, *
  FROM read_csv('balancing/runs/*.csv', union_by_name = true, header = true, filename = true)
),
rows AS (
  SELECT
    r.filename, r.seq, r.run_id, r.run_type, r.config_id, r.elapsed_s, r.event, r.amount, r.coins, r.stock,
    r.upgrade_level AS brews,
    coalesce(r.crate_level, 0) AS crates,
    LEAD(r.elapsed_s) OVER (PARTITION BY r.filename ORDER BY r.seq) AS next_s,
    max(CASE WHEN r.event = 'restock' THEN r.elapsed_s END)
      OVER (PARTITION BY r.filename ORDER BY r.seq ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
      + c.restockCooldown AS ready_at,
    c.* EXCLUDE (id)
  FROM raw r
  JOIN cfg c ON c.id = r.config_id
),
state AS (
  SELECT *,
    coalesce(next_s, elapsed_s) - elapsed_s AS gap_s,
    salePrice + upgradePriceStep * brews AS price_now,
    restockBatch + cratesBatchStep * crates AS batch,
    round(upgradeBaseCost * pow(upgradeCostGrowth, brews)) AS brews_cost,
    round(cratesBaseCost * pow(cratesCostGrowth, crates)) AS crates_cost
  FROM rows
),
avail AS (
  -- Same rules as canUpgrade / canUpgradeCrates / canRestock in src/economy/economy.ts.
  SELECT *,
    (coins >= brews_cost AND coins - brews_cost + stock * (price_now + upgradePriceStep) >= restockCost)
      OR (crates < cratesMaxLevel AND coins >= crates_cost AND coins - crates_cost + stock * price_now >= restockCost)
      AS upgrade_ok,
    stock <= shelfCap - batch AND coins >= restockCost AS restock_ok_apart_from_cooldown,
    -- Cheapest upgrade still on offer, for the surplus metric.
    CASE WHEN crates < cratesMaxLevel THEN least(brews_cost, crates_cost) ELSE brews_cost END AS next_upgrade_cost
  FROM state
),
idle AS (
  -- Idle = no action available (GDD §6): no upgrade, and Restock blocked by slots or coins for
  -- the whole gap, or by the cooldown until ready_at.
  SELECT *,
    CASE
      WHEN upgrade_ok THEN 0
      WHEN NOT restock_ok_apart_from_cooldown THEN gap_s
      ELSE greatest(0, least(coalesce(next_s, elapsed_s), coalesce(ready_at, 0)) - elapsed_s)
    END AS idle_s
  FROM avail
),
idle_runs AS (
  -- Longest idle stretch: consecutive rows idle for their whole gap (a cooldown-only gap ends a stretch).
  SELECT filename, round(max(stretch_s), 1) AS longest_idle_s
  FROM (
    SELECT filename, grp, sum(idle_s) AS stretch_s
    FROM (
      SELECT *, sum(CASE WHEN gap_s > 0 AND idle_s = gap_s THEN 0 ELSE 1 END)
        OVER (PARTITION BY filename ORDER BY seq) AS grp
      FROM idle
    )
    WHERE gap_s > 0 AND idle_s = gap_s
    GROUP BY filename, grp
  )
  GROUP BY filename
),
actions AS (
  -- Action spacing: gaps between player actions, counting the session start and end.
  SELECT filename, round(avg(gap), 1) AS mean_action_gap_s, round(max(gap), 1) AS longest_action_gap_s
  FROM (
    SELECT filename, elapsed_s - LAG(elapsed_s) OVER (PARTITION BY filename ORDER BY seq) AS gap
    FROM idle
    WHERE event IN ('session_start', 'restock', 'upgrade', 'crates_upgrade', 'session_end')
  )
  WHERE gap IS NOT NULL
  GROUP BY filename
),
rush_rows AS (
  -- Each arrival inside a rush window (start exclusive, end inclusive, as the economy schedules them).
  SELECT i.filename, k AS rush, i.event
  FROM idle i, range(1, len(i.rushes) + 1) t(k)
  WHERE i.event IN ('sale', 'missed_sale')
    AND i.elapsed_s > i.rushes[k].startS AND i.elapsed_s <= i.rushes[k].endS
),
rushes AS (
  SELECT filename, string_agg(served || '/' || (served + missed), ' ' ORDER BY rush) AS rush_served
  FROM (
    SELECT filename, rush,
      count(*) FILTER (WHERE event = 'sale') AS served,
      count(*) FILTER (WHERE event = 'missed_sale') AS missed
    FROM rush_rows
    GROUP BY filename, rush
  )
  GROUP BY filename
),
runs AS (
  SELECT
    filename,
    any_value(run_id) AS run_id,
    any_value(config_id) AS config_id,
    any_value(run_type) AS run_type,
    bool_or(event = 'session_end') AS complete,
    arg_max(coins, seq) - any_value(startCoins) AS profit,
    coalesce(sum(amount) FILTER (WHERE event = 'sale'), 0) AS revenue,
    -coalesce(sum(amount) FILTER (WHERE event = 'restock'), 0) AS restock_spend,
    -coalesce(sum(amount) FILTER (WHERE event = 'upgrade'), 0) AS brews_spend,
    -coalesce(sum(amount) FILTER (WHERE event = 'crates_upgrade'), 0) AS crates_spend,
    arg_max(coins, seq) AS closing,
    count(*) FILTER (WHERE event = 'sale') AS sold,
    count(*) FILTER (WHERE event = 'missed_sale') AS missed,
    count(*) FILTER (WHERE event = 'restock') AS restocks,
    arg_max(brews, seq) AS brews_level,
    arg_max(crates, seq) AS crates_level,
    min(elapsed_s) FILTER (WHERE event IN ('upgrade', 'crates_upgrade')) AS first_upgrade_s,
    max(elapsed_s) FILTER (WHERE event IN ('upgrade', 'crates_upgrade')) AS last_upgrade_s,
    round(sum(idle_s), 1) AS idle_s,
    coalesce(sum(amount) FILTER (WHERE event = 'sale' AND elapsed_s >= 60 AND elapsed_s < 120), 0) AS revenue_min2,
    coalesce(sum(amount) FILTER (WHERE event = 'sale' AND elapsed_s >= 240), 0) AS revenue_min5,
    round(sum((coins - next_upgrade_cost) * gap_s) / nullif(sum(gap_s), 0), 1) AS avg_surplus,
    -- Reconciliation: first row's coins + every signed amount = last row's coins; first row = startCoins.
    arg_min(coins, seq) + sum(amount) = arg_max(coins, seq) AND arg_min(coins, seq) = any_value(startCoins) AS reconciles
  FROM idle
  GROUP BY filename
)
SELECT
  r.run_id, r.config_id, r.run_type, r.complete, r.profit, r.revenue, r.restock_spend, r.brews_spend,
  r.crates_spend, r.closing, r.sold, r.missed, coalesce(x.rush_served, '') AS rush_served, r.restocks,
  r.brews_level, r.crates_level, r.first_upgrade_s, r.last_upgrade_s, r.idle_s,
  coalesce(l.longest_idle_s, 0) AS longest_idle_s, a.mean_action_gap_s, a.longest_action_gap_s,
  r.revenue_min2, r.revenue_min5, r.avg_surplus, r.reconciles,
  regexp_extract(r.filename, '[^/\\]+$') AS file
FROM runs r
LEFT JOIN rushes x USING (filename)
LEFT JOIN idle_runs l USING (filename)
LEFT JOIN actions a USING (filename)
ORDER BY r.config_id, r.filename;
