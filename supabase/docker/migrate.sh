#!/bin/sh
# Applies the SQL migrations after Auth/Storage have created their schemas,
# then grants API roles and reloads PostgREST's schema cache.
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres"

echo "Checking existing schema..."
if $PSQL -tAc "select to_regclass('public.pages')" | grep -q pages; then
  echo "Schema already present; skipping migration files."
else
  for f in $(ls /migrations/*.sql | sort); do
    echo "==> applying $f"
    $PSQL -f "$f"
  done
fi

echo "Granting API roles + reloading PostgREST..."
$PSQL <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
notify pgrst, 'reload schema';
SQL

echo "Migration complete."
