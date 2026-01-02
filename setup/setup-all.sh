#!/bin/bash
set -e

echo "=========================================="
echo "  Database Setup Script"
echo "=========================================="
echo ""

# Check if running as root (some commands need sudo)
if [ "$EUID" -eq 0 ]; then 
   echo "Please do not run this script as root. It will use sudo when needed."
   exit 1
fi

# Setup PostgreSQL
echo ""
read -p "Setup PostgreSQL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash /home/server/setup-postgresql.sh
fi

# Setup Redis
echo ""
read -p "Setup Redis? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash /home/server/setup-redis.sh
fi

# Setup MongoDB
echo ""
read -p "Setup MongoDB? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash /home/server/setup-mongodb.sh
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Remember to change the default passwords:"
echo "  - PostgreSQL: strong_pg_password"
echo "  - Redis: strong_redis_password"
echo ""

