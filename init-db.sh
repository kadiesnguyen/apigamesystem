#!/bin/bash
set -e

# Create the postgres user if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
            CREATE USER postgres WITH SUPERUSER;
        END IF;
    END
    \$\$;
EOSQL

echo "Created postgres user successfully"

# Now run the game.sql file
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /tmp/game.sql

echo "Database initialization completed successfully"