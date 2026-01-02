#!/bin/bash

set -e

REDIS_PASSWORD="${1:-strong_redis_password}"
REDIS_CONF="/etc/redis/redis.conf"

echo "=== Configuring Redis Password ==="
echo "Password: $REDIS_PASSWORD"

if [ ! -f "$REDIS_CONF" ]; then
    echo "Error: Redis config file not found at $REDIS_CONF"
    exit 1
fi

# Backup config
echo "Backing up Redis config..."
sudo cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Set or update requirepass
if grep -q "^requirepass " "$REDIS_CONF"; then
    echo "Updating existing requirepass..."
    sudo sed -i "s/^requirepass .*/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"
elif grep -q "^# requirepass" "$REDIS_CONF"; then
    echo "Uncommenting and setting requirepass..."
    sudo sed -i "s/^# requirepass .*/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"
else
    echo "Adding requirepass..."
    echo "requirepass $REDIS_PASSWORD" | sudo tee -a "$REDIS_CONF"
fi

# Restart Redis
echo "Restarting Redis..."
sudo systemctl restart redis-server

# Wait a bit for Redis to start
sleep 2

# Test connection
echo "Testing Redis connection with password..."
if redis-cli -a "$REDIS_PASSWORD" PING > /dev/null 2>&1; then
    echo "✓ Redis password configured successfully!"
    echo ""
    echo "Connection test:"
    redis-cli -a "$REDIS_PASSWORD" PING
else
    echo "✗ Redis connection test failed"
    echo "Please check Redis logs: sudo journalctl -u redis-server"
    exit 1
fi

echo ""
echo "=== Redis Password Configuration Complete ==="
echo "Remember to update your .env file with:"
echo "  REDIS_PASSWORD=$REDIS_PASSWORD"

