#!/bin/bash

echo "=== Fixing PostgreSQL Repository Configuration ==="

# Detect Ubuntu version
UBUNTU_VERSION=$(lsb_release -cs 2>/dev/null || echo "jammy")
echo "Detected Ubuntu version: $UBUNTU_VERSION"

# Fix PostgreSQL repository files
FIXED=false

# Fix pgdg.list if exists
if [ -f "/etc/apt/sources.list.d/pgdg.list" ]; then
    echo "Found /etc/apt/sources.list.d/pgdg.list"
    if grep -q "focal" "/etc/apt/sources.list.d/pgdg.list"; then
        echo "Fixing: focal -> $UBUNTU_VERSION"
        sudo sed -i "s/focal/$UBUNTU_VERSION/g" /etc/apt/sources.list.d/pgdg.list
        sudo sed -i "s/focal-pgdg/${UBUNTU_VERSION}-pgdg/g" /etc/apt/sources.list.d/pgdg.list
        FIXED=true
    fi
fi

# Check all .list files in sources.list.d
for file in /etc/apt/sources.list.d/*.list; do
    if [ -f "$file" ] && grep -q "focal-pgdg" "$file" 2>/dev/null; then
        echo "Found focal-pgdg in $file"
        echo "Fixing: focal -> $UBUNTU_VERSION"
        sudo sed -i "s/focal/$UBUNTU_VERSION/g" "$file"
        sudo sed -i "s/focal-pgdg/${UBUNTU_VERSION}-pgdg/g" "$file"
        FIXED=true
    fi
done

# Check main sources.list
if [ -f "/etc/apt/sources.list" ] && grep -q "focal-pgdg" /etc/apt/sources.list 2>/dev/null; then
    echo "Found focal-pgdg in /etc/apt/sources.list"
    echo "Fixing: focal -> $UBUNTU_VERSION"
    sudo sed -i "s/focal/$UBUNTU_VERSION/g" /etc/apt/sources.list
    sudo sed -i "s/focal-pgdg/${UBUNTU_VERSION}-pgdg/g" /etc/apt/sources.list
    FIXED=true
fi

if [ "$FIXED" = true ]; then
    echo ""
    echo "Repository configuration fixed!"
    echo "Running apt update..."
    sudo apt update
    echo ""
    echo "✓ PostgreSQL repository fixed successfully"
else
    echo "No PostgreSQL repository issues found"
fi

echo "=== Done ==="

