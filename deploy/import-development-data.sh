#!/usr/bin/env bash
# One-time: copy your development data (database and encrypted document files) into production.
# Safe to run while development is running (uses SQLite's online backup). Refuses to overwrite
# existing production data. Document files are hard-linked (copied if that's not possible), so they
# take no extra disk space, and deleting a document in one environment never removes the other's copy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORAGE="$ROOT/backend/storage"
DEV_DB="$STORAGE/development.sqlite3"
PROD_DB="$STORAGE/production.sqlite3"
PROD_FILES="$STORAGE/production_files"

[[ -f "$DEV_DB" ]] || { echo "No development database at $DEV_DB — nothing to import."; exit 0; }
if [[ -f "$PROD_DB" ]] && [[ "$(sqlite3 "$PROD_DB" "SELECT count(*) FROM users" 2>/dev/null || echo 0)" != "0" ]]; then
  echo "Production already has data ($PROD_DB). Not overwriting." >&2
  exit 1
fi
if systemctl is-active --quiet jarvis; then
  echo "Stop production first: sudo systemctl stop jarvis" >&2
  exit 1
fi

echo "== Copying database"
rm -f "$PROD_DB" "$PROD_DB-wal" "$PROD_DB-shm"
python3 -I -c 'import sqlite3, sys
src = sqlite3.connect(sys.argv[1]); dst = sqlite3.connect(sys.argv[2])
src.backup(dst); dst.close(); src.close()' "$DEV_DB" "$PROD_DB"

echo "== Linking document files"
mkdir -p "$PROD_FILES"
count=0
for dir in "$STORAGE"/??/; do
  [[ -d "$dir" ]] || continue
  # Hard links share disk space; fall back to copying if storage spans filesystems
  cp -al "$dir" "$PROD_FILES/" 2>/dev/null || cp -a "$dir" "$PROD_FILES/"
  count=$((count + $(find "$dir" -type f | wc -l)))
done
echo "   $count file(s)"

echo "== Preparing production database"
cd "$ROOT/backend"
RAILS_ENV=production bin/rails db:environment:set
RAILS_ENV=production bin/rails db:prepare
# Development sign-ins aren't valid in production; start with no sessions
RAILS_ENV=production bin/rails runner 'Session.delete_all'
echo "Imported. Sign in with your existing username and password."
