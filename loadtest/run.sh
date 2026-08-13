#!/usr/bin/env bash
# Wrapper: runs one k6 profile and archives the JSON summary + a copy of the
# generated summary line under docs/audits/perf/loadtest-<date>/.
#
# Usage: ./run.sh <profile> [k6-extra-args...]
#   ./run.sh smoke
#   ./run.sh target-200
set -euo pipefail

PROFILE="${1:?Usage: run.sh <smoke|baseline|target-200|stress|spike|soak>}"
shift || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE_FILE="$SCRIPT_DIR/profiles/$PROFILE.js"
if [ ! -f "$PROFILE_FILE" ]; then
  echo "No such profile: $PROFILE_FILE" >&2
  exit 1
fi

DATE_TAG="${LOADTEST_DATE_TAG:-$(date +%Y%m%d)}"
OUT_DIR="$SCRIPT_DIR/../docs/audits/perf/loadtest-$DATE_TAG"
mkdir -p "$OUT_DIR"

SUMMARY_JSON="$OUT_DIR/$PROFILE-summary.json"

echo "Running profile '$PROFILE' -> $SUMMARY_JSON"
k6 run \
  --summary-export "$SUMMARY_JSON" \
  "$@" \
  "$PROFILE_FILE"
