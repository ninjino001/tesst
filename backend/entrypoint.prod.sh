#!/usr/bin/env bash
set -e

echo "Waiting for database..."
while ! python -c "import psycopg2; psycopg2.connect(dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD', host='$DB_HOST', port='$DB_PORT')" 2>/dev/null; do
  sleep 2
done

echo "Running migrations..."
python manage.py migrate --noinput

echo "Initializing categories..."
python manage.py init_categories || true

echo "Ensuring admin user exists..."
python manage.py createadmin || true

echo "Starting: $@"
exec "$@"
