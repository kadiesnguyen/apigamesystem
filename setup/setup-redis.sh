#!/bin/bash
set -e

echo "=== Setting up Redis ==="

# 1. Cài đặt Redis
echo "Installing Redis..."

# Fix PostgreSQL repository issue if exists (Focal -> Jammy)
if [ -f "/etc/apt/sources.list.d/pgdg.list" ]; then
    echo "Fixing PostgreSQL repository configuration (Focal -> Jammy)..."
    sudo sed -i 's/focal/jammy/g' /etc/apt/sources.list.d/pgdg.list 2>/dev/null || true
    sudo sed -i 's/focal-pgdg/jammy-pgdg/g' /etc/apt/sources.list.d/pgdg.list 2>/dev/null || true
fi

# Check for focal-pgdg in other files
for file in /etc/apt/sources.list.d/*.list; do
    if [ -f "$file" ] && grep -q "focal-pgdg" "$file" 2>/dev/null; then
        echo "Fixing PostgreSQL repository in $file..."
        sudo sed -i 's/focal/jammy/g' "$file" 2>/dev/null || true
        sudo sed -i 's/focal-pgdg/jammy-pgdg/g' "$file" 2>/dev/null || true
    fi
done

# Update package lists (allow errors to not stop the script)
echo "Updating package lists..."
set +e  # Temporarily disable exit on error
sudo apt update 2>&1 | tee /tmp/apt-update.log
APT_UPDATE_EXIT=${PIPESTATUS[0]}
set -e  # Re-enable exit on error

if [ $APT_UPDATE_EXIT -eq 0 ]; then
    echo "Package lists updated successfully"
else
    echo "Warning: apt update had some errors, but continuing with Redis installation..."
    echo "If Redis installation fails, please fix the repository issues first."
fi

sudo apt -y install redis-server

# 2. Cấu hình Redis
echo "Configuring Redis..."
REDIS_CONF="/etc/redis/redis.conf"
if [ -f "$REDIS_CONF" ]; then
    # Set supervised to systemd
    sudo sed -i "s/^supervised .*/supervised systemd/" "$REDIS_CONF"
    
    # Set requirepass (nếu chưa có dòng requirepass, thêm mới)
    if grep -q "^# requirepass" "$REDIS_CONF" || grep -q "^requirepass" "$REDIS_CONF"; then
        sudo sed -i "s/^# requirepass .*/requirepass strong_redis_password/" "$REDIS_CONF"
        sudo sed -i "s/^requirepass .*/requirepass strong_redis_password/" "$REDIS_CONF"
    else
        echo "requirepass strong_redis_password" | sudo tee -a "$REDIS_CONF"
    fi
    
    echo "Redis configuration updated"
else
    echo "Warning: redis.conf not found at $REDIS_CONF"
fi

# 3. Enable and start Redis
echo "Enabling and starting Redis..."
sudo systemctl enable --now redis-server

# 4. Test Redis
echo "Testing Redis connection..."
sleep 2
if redis-cli -a strong_redis_password PING > /dev/null 2>&1; then
    echo "✓ Redis is working correctly"
else
    echo "✗ Redis test failed. Please check the configuration."
    exit 1
fi

echo "=== Redis setup complete ==="
echo "Password: strong_redis_password"
echo "Connection: 127.0.0.1:6379"

