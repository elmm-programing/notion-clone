-- Schema the Realtime service connects into (DB_AFTER_CONNECT_QUERY sets the
-- search_path to _realtime, so it must exist before Realtime boots).
create schema if not exists _realtime;
grant all on schema _realtime to supabase_admin;
