#!/usr/bin/env bash
set -e

# Wait for DB to be available and apply initial migrations.
echo "Waiting for database..."
retries=0
while true; do
  if python manage.py migrate --noinput --fake-initial; then
    break
  fi

  echo "Migrate failed; reconciling existing tables and retrying..."
  python - <<'PY'
import os
import sys

try:
    import psycopg2
except ImportError:
    sys.exit(0)

DB = {
    'dbname': os.getenv('DB_NAME', 'aimosdb'),
    'user': os.getenv('DB_USER', 'aimos'),
    'password': os.getenv('DB_PASSWORD', 'aimos123'),
    'host': os.getenv('DB_HOST', 'aimos'),
    'port': os.getenv('DB_PORT', '5432'),
}

# All migration records that should be present for a schema already
# materialized via raw SQL scripts (recreate_all_tables.sql, etc.).
#
# NOTE: We use INSERT ... WHERE NOT EXISTS instead of ON CONFLICT because
# django_migrations has no unique constraint on (app, name), so ON CONFLICT
# would raise an error and be swallowed by the try/except.
MIGRATION_RECORDS = [
    ('admin', '0001_initial'),
    ('admin', '0002_logentry_remove_auto_add'),
    ('admin', '0003_logentry_add_action_flag_choices'),
    ('auth', '0001_initial'),
    ('auth', '0002_alter_permission_name_max_length'),
    ('auth', '0003_alter_user_email_max_length'),
    ('auth', '0004_alter_user_username_opts'),
    ('auth', '0005_alter_user_last_login_null'),
    ('auth', '0006_require_contenttypes_0002'),
    ('auth', '0007_alter_validators_add_error_messages'),
    ('auth', '0008_alter_user_username_max_length'),
    ('auth', '0009_alter_user_last_name_max_length'),
    ('auth', '0010_alter_group_name_max_length'),
    ('auth', '0011_update_proxy_permissions'),
    ('auth', '0012_alter_user_first_name_max_length'),
    ('contenttypes', '0001_initial'),
    ('contenttypes', '0002_remove_content_type_name'),
    ('sessions', '0001_initial'),
    ('users', '0001_initial'),
    ('users', '0002_systemadmin_userplainpassword'),
]

try:
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT to_regclass('public.django_migrations')")
    if cur.fetchone()[0] is None:
        sys.exit(0)

    for app, name in MIGRATION_RECORDS:
        cur.execute(
            "INSERT INTO django_migrations (app, name, applied) "
            "SELECT %s, %s, NOW() "
            "WHERE NOT EXISTS (SELECT 1 FROM django_migrations WHERE app = %s AND name = %s)",
            (app, name, app, name),
        )
except Exception as e:
    print("Reconcile error:", e)
PY

  retries=$((retries+1))
  if [ $retries -gt 30 ]; then
    echo "Database migration failed after many attempts"
    break
  fi
  sleep 2
done

# Create admin user (command is idempotent)
echo "Ensuring admin user exists..."
python manage.py createadmin || true

# Initialize default categories
echo "Ensuring default categories exist..."
python manage.py init_categories || true

# Execute the container CMD
echo "Starting command: $@"
exec "$@"
