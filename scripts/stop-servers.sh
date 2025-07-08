#!/bin/bash

# MCP Display Server Shutdown Script
# This script ensures all server processes are properly terminated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 MCP Display Server Shutdown Script${NC}"
echo "======================================"
echo ""

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    
    echo -n "🔍 Checking for processes on port $port ($name)... "
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ No processes found${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Found processes: $pids${NC}"
    
    # Try graceful shutdown first
    echo "   💤 Sending SIGTERM to processes on port $port..."
    for pid in $pids; do
        if kill -TERM "$pid" 2>/dev/null; then
            echo "      ✅ Sent SIGTERM to PID $pid"
        fi
    done
    
    # Wait a bit for graceful shutdown
    sleep 2
    
    # Check if processes are still running
    local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$remaining_pids" ]; then
        echo "   🔨 Force killing remaining processes on port $port..."
        for pid in $remaining_pids; do
            if kill -KILL "$pid" 2>/dev/null; then
                echo "      ⚡ Force killed PID $pid"
            fi
        done
    fi
    
    echo -e "   ${GREEN}✅ Port $port is now free${NC}"
}

# Function to kill processes by name pattern
kill_by_pattern() {
    local pattern=$1
    local description=$2
    
    echo -n "🔍 Looking for $description processes... "
    
    # Find processes matching the pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ No processes found${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Found processes: $pids${NC}"
    
    # Try graceful shutdown first
    echo "   💤 Sending SIGTERM to $description processes..."
    for pid in $pids; do
        if kill -TERM "$pid" 2>/dev/null; then
            echo "      ✅ Sent SIGTERM to PID $pid"
        fi
    done
    
    # Wait a bit for graceful shutdown
    sleep 2
    
    # Check if processes are still running
    local remaining_pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ -n "$remaining_pids" ]; then
        echo "   🔨 Force killing remaining $description processes..."
        for pid in $remaining_pids; do
            if kill -KILL "$pid" 2>/dev/null; then
                echo "      ⚡ Force killed PID $pid"
            fi
        done
    fi
    
    echo -e "   ${GREEN}✅ All $description processes terminated${NC}"
}

# Main shutdown sequence
echo "Starting shutdown sequence..."
echo ""

# 1. Kill processes on specific ports
kill_port 3000 "MCP HTTP Server"
kill_port 3001 "WebSocket Server" 
kill_port 5173 "Vue.js Dev Server"
kill_port 4173 "Vue.js Preview Server"

echo ""

# 2. Kill nodemon processes
kill_by_pattern "nodemon.*server/index.js" "nodemon"

# 3. Kill any remaining MCP display processes
kill_by_pattern "server/index.js" "MCP server"

# 4. Kill concurrently processes
kill_by_pattern "concurrently.*npm run" "concurrently"

# 5. Kill any Vue.js dev processes that might be lingering
kill_by_pattern "vite.*--port 5173" "Vite dev server"

echo ""
echo -e "${GREEN}🎉 All MCP Display server processes have been terminated${NC}"
echo ""

# Verify ports are free
echo "🔍 Final verification..."
for port in 3000 3001 5173 4173; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "   ${RED}❌ Port $port is still in use${NC}"
    else
        echo -e "   ${GREEN}✅ Port $port is free${NC}"
    fi
done

echo ""
echo -e "${BLUE}✨ Shutdown complete! You can now restart the servers safely.${NC}"
echo ""
echo "To restart:"
echo "  npm run dev"
echo "" 