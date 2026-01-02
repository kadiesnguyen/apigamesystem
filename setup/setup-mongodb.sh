#!/bin/bash
set -e

echo "=== Setting up MongoDB ==="

# 1. Thêm MongoDB repository
echo "Adding MongoDB repository..."

# Detect Ubuntu version
UBUNTU_VERSION=$(lsb_release -cs 2>/dev/null || echo "jammy")
echo "Detected Ubuntu version: $UBUNTU_VERSION"

# Download and add MongoDB GPG key
if [ ! -f "/usr/share/keyrings/mongodb-server-7.0.gpg" ]; then
    echo "Downloading MongoDB GPG key..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc -o /tmp/mongodb-server-7.0.asc
    sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg /tmp/mongodb-server-7.0.asc
    rm -f /tmp/mongodb-server-7.0.asc
else
    echo "MongoDB GPG key already exists"
fi

# Add MongoDB repository (use jammy for Ubuntu 22.04, focal for 20.04)
if [ "$UBUNTU_VERSION" = "focal" ]; then
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
else
    # For Ubuntu 22.04+ (jammy, lunar, etc.), use jammy repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
fi

# 2. Update và cài đặt MongoDB
echo "Installing MongoDB..."
sudo apt update
sudo apt -y install mongodb-org

# 3. Enable and start MongoDB
echo "Enabling and starting MongoDB..."
sudo systemctl enable --now mongod

# 4. Test MongoDB
echo "Testing MongoDB connection..."
sleep 3
if mongosh --eval 'db.runCommand({ ping: 1 })' > /dev/null 2>&1; then
    echo "✓ MongoDB is working correctly"
else
    echo "✗ MongoDB test failed. Please check the logs with: sudo journalctl -u mongod"
    exit 1
fi

echo "=== MongoDB setup complete ==="
echo "Connection: mongodb://localhost:27017"

