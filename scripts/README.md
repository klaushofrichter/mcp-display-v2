# MCP Display Server Shutdown Scripts

This directory contains scripts to properly terminate all MCP Display server processes, addressing issues with orphaned processes that sometimes occur when using `concurrently` with `nodemon`.

## Available Scripts

### 1. `stop-servers.js` (Cross-platform, Node.js)
**Recommended for most users**

```bash
npm run stop
# or directly:
node scripts/stop-servers.js
```

**Features:**
- Works on Windows, macOS, and Linux
- Uses Node.js built-in process management
- Graceful termination with fallback to force kill
- Real-time progress reporting
- Port verification after shutdown

### 2. `stop-servers.sh` (Unix/Linux/macOS only)
**For users who prefer shell scripts**

```bash
npm run stop:shell
# or directly:
./scripts/stop-servers.sh
```

**Features:**
- More efficient on Unix-like systems
- Uses `lsof` and `pgrep` for process discovery
- Graceful SIGTERM followed by SIGKILL if needed
- Detailed logging and colored output

### 3. Force Shutdown (Combined approach)
**When processes are particularly stubborn**

```bash
npm run stop:force
```

This runs both scripts in sequence to ensure complete cleanup.

## What Gets Terminated

### Ports Monitored
- **3000** - MCP HTTP Server
- **3001** - WebSocket Server
- **5173** - Vue.js Development Server (Vite)
- **4173** - Vue.js Preview Server

### Process Patterns
- `nodemon` processes running `server/index.js`
- Direct Node.js processes running `server/index.js`
- `concurrently` processes managing multiple npm scripts
- Vite development server processes

## When to Use These Scripts

### 1. Regular Development Workflow
```bash
# Start development
npm run dev

# Work on your project...

# Stop when done
npm run stop
```

### 2. After Ctrl+C Doesn't Work
Sometimes `Ctrl+C` in the terminal doesn't properly terminate all child processes:
```bash
# This may leave orphaned processes
^C  # Ctrl+C

# Clean up any remaining processes
npm run stop
```

### 3. Port Conflicts
If you get "port already in use" errors:
```bash
# Error: Port 3000 is already in use
npm run dev  # fails

# Clean up and try again
npm run stop
npm run dev  # should work now
```

### 4. Before Running Tests
Ensure clean state before running tests:
```bash
npm run stop
npm test
```

### 5. MCP Client Connection Issues
If Claude Code or other MCP clients can't connect, there might be stale server processes:
```bash
npm run stop
npm run dev
# Try connecting your MCP client again
```

## Troubleshooting

### Script Won't Run (Permission Issues)
```bash
chmod +x scripts/stop-servers.sh
chmod +x scripts/stop-servers.js
```

### Processes Still Running After Script
```bash
# Check manually
lsof -ti:3000 -ti:3001 -ti:5173

# Force kill specific PIDs
kill -KILL <PID>

# Nuclear option (kills all Node.js processes - use with caution!)
pkill -f node
```

### Script Reports "No processes found" but ports seem busy
This can happen with zombie processes or processes that aren't properly reporting:
```bash
# Try the force shutdown
npm run stop:force

# Or reboot your system as a last resort
```

## Understanding the Output

### Successful Termination
```
✅ No processes found          # Port is already free
✅ Terminated PID 1234         # Process gracefully stopped
⚡ Force killed PID 1234       # Process required force termination
```

### Issues
```
❌ Port 3000 is still in use   # Manual intervention may be needed
⚠️  Could not terminate PID    # Process protected or already dead
```

## Integration with Development Workflow

### Recommended .bashrc/.zshrc aliases
```bash
alias mcp-start='cd /path/to/mcp-display-v2 && npm run dev'
alias mcp-stop='cd /path/to/mcp-display-v2 && npm run stop'
alias mcp-restart='cd /path/to/mcp-display-v2 && npm run stop && npm run dev'
```

### VS Code Tasks
Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Stop MCP Servers",
      "type": "shell",
      "command": "npm",
      "args": ["run", "stop"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

## Technical Details

### Graceful Shutdown Process
1. **Discovery** - Find processes using target ports and patterns
2. **SIGTERM** - Send termination signal allowing graceful cleanup
3. **Wait** - Allow 2-5 seconds for graceful shutdown
4. **SIGKILL** - Force kill any remaining processes
5. **Verify** - Confirm ports are free

### Process Discovery Methods

**Node.js Script:**
- Windows: `netstat -ano` + `wmic process`
- Unix: `lsof -ti` + `pgrep -f`

**Shell Script:**
- `lsof -ti:<port>` for port-based discovery
- `pgrep -f "<pattern>"` for pattern-based discovery

### Error Handling
- Scripts continue even if individual termination attempts fail
- Multiple discovery methods ensure comprehensive coverage
- Final verification confirms successful cleanup
- Non-zero exit codes only for script execution errors, not missing processes

## Contributing

When modifying these scripts:
1. Test on multiple platforms (Windows/macOS/Linux)
2. Ensure graceful termination is attempted before force killing
3. Add appropriate logging for debugging
4. Update this documentation
5. Test with actual development workflow scenarios 