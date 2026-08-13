#!/usr/bin/env bash
# Samples pg_stat_activity every 5s while a k6 run is in progress, so the
# pg.Pool(max: 10) saturation point (backend/src/db/prisma.ts) is visible in
# the results, not just inferred from k6 error rates.
#
# Usage: DATABASE_URL='postgresql://...' ./monitor-db-pool.sh out.csv
# Stop with Ctrl-C (or SIGTERM from the orchestrating process).
set -euo pipefail

OUT_FILE="${1:?Usage: DATABASE_URL=... monitor-db-pool.sh <out.csv>}"
: "${DATABASE_URL:?Set DATABASE_URL to the Postgres connection string}"

echo "timestamp,total_connections,active,idle,idle_in_transaction,longest_query_seconds,waiting_on_lock" > "$OUT_FILE"

echo "Sampling pg_stat_activity every 5s -> $OUT_FILE (Ctrl-C to stop)"
while true; do
  ROW=$(psql "$DATABASE_URL" -X -A -t -F',' -c "
    SELECT
      now(),
      count(*),
      count(*) FILTER (WHERE state = 'active'),
      count(*) FILTER (WHERE state = 'idle'),
      count(*) FILTER (WHERE state = 'idle in transaction'),
      coalesce(round(extract(epoch FROM max(now() - query_start))::numeric, 1), 0),
      count(*) FILTER (WHERE wait_event_type = 'Lock')
    FROM pg_stat_activity
    WHERE datname = current_database();
  " 2>/dev/null || true)
  if [ -n "$ROW" ]; then
    echo "$ROW" >> "$OUT_FILE"
  fi
  sleep 5
done
