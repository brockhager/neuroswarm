#!/usr/bin/env bash
set -euo pipefail

# run-migrations.sh
# Applies all SQL migration files from the migrations/ directory in alphanumeric order.
# Expects environment variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

if [ -z "${PGHOST+x}" ] || [ -z "${PGUSER+x}" ] || [ -z "${PGPASSWORD+x}" ] || [ -z "${PGDATABASE+x}" ]; then
  echo "ERROR: Please set PGHOST, PGUSER, PGPASSWORD and PGDATABASE environment variables before running this script."
  exit 2
fi

MIGRATIONS_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Applying SQL migrations from ${MIGRATIONS_DIR}"

shopt -s nullglob
files=("${MIGRATIONS_DIR}"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No migration files found in ${MIGRATIONS_DIR}"
  exit 0
fi

for file in "${files[@]}"; do
  echo "-> Applying $(basename "$file")"
  psql -v ON_ERROR_STOP=1 --host="$PGHOST" --port="${PGPORT:-5432}" --username="$PGUSER" --dbname="$PGDATABASE" -f "$file"
  echo "   OK"
done

echo "All migrations applied."
