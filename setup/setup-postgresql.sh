#!/bin/bash
set -e

echo "=== Setting up PostgreSQL ==="

# 1. Tạo DB/user
echo "Creating database and user..."
sudo -u postgres psql <<'EOF'
CREATE ROLE gameserver WITH LOGIN PASSWORD 'strong_pg_password';

CREATE DATABASE game OWNER gameserver;

GRANT ALL PRIVILEGES ON DATABASE game TO gameserver;
EOF

# 2. Chỉnh postgresql.conf
echo "Configuring postgresql.conf..."
POSTGRES_CONF="/etc/postgresql/14/main/postgresql.conf"
if [ -f "$POSTGRES_CONF" ]; then
    sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '127.0.0.1'/g" "$POSTGRES_CONF"
    echo "postgresql.conf updated"
else
    echo "Warning: postgresql.conf not found at $POSTGRES_CONF"
    echo "Please check your PostgreSQL version and adjust the path"
fi

# 3. Restart PostgreSQL
echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "=== PostgreSQL setup complete ==="
echo "Database: game"
echo "User: gameserver"
echo "Password: strong_pg_password"
echo "Connection: 127.0.0.1:5432"

