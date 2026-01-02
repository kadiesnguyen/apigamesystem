#!/bin/bash

echo "Stopping all development processes..."

# Kill all Bun processes
pkill -f "bun" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 1

# Force kill any remaining Bun processes
pkill -9 -f "bun" 2>/dev/null || true

# Kill processes on port 3000
lsof -t -i:3000 | xargs kill -9 2>/dev/null || true

# Kill processes on port 3001
lsof -t -i:3001 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 1

# Check if ports are free
echo "Checking ports..."
if lsof -i:3000 >/dev/null 2>&1; then
    echo "Warning: Port 3000 still in use"
    lsof -i:3000
else
    echo "Port 3000 is free"
fi

if lsof -i:3001 >/dev/null 2>&1; then
    echo "Warning: Port 3001 still in use"
    lsof -i:3001
else
    echo "Port 3001 is free"
fi

echo "All processes stopped successfully!"
