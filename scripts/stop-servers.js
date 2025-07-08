#!/usr/bin/env node

/**
 * MCP Display Server Shutdown Script (Node.js Version)
 * Cross-platform script to ensure all server processes are properly terminated
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import process from 'process';

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🛑 MCP Display Server Shutdown Script${colors.reset}`);
console.log('======================================');
console.log('');

/**
 * Kill processes using a specific port
 */
async function killPort(port, name) {
  process.stdout.write(`🔍 Checking for processes on port ${port} (${name})... `);
  
  try {
    let command;
    
    if (process.platform === 'win32') {
      // Windows command
      command = `netstat -ano | findstr :${port}`;
    } else {
      // macOS/Linux command
      command = `lsof -ti:${port}`;
    }
    
    const { stdout } = await execAsync(command);
    
    if (!stdout.trim()) {
      console.log(`${colors.green}✅ No processes found${colors.reset}`);
      return;
    }
    
    let pids;
    if (process.platform === 'win32') {
      // Extract PIDs from netstat output on Windows
      pids = stdout.split('\n')
        .filter(line => line.includes(`:${port}`))
        .map(line => line.trim().split(/\s+/).pop())
        .filter(pid => pid && !isNaN(pid));
    } else {
      // Extract PIDs from lsof output on macOS/Linux
      pids = stdout.trim().split('\n').filter(pid => pid);
    }
    
    if (pids.length === 0) {
      console.log(`${colors.green}✅ No processes found${colors.reset}`);
      return;
    }
    
    console.log(`${colors.yellow}Found processes: ${pids.join(', ')}${colors.reset}`);
    
    // Kill processes
    for (const pid of pids) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${pid} /F`);
        } else {
          await execAsync(`kill -TERM ${pid}`);
        }
        console.log(`      ✅ Terminated PID ${pid}`);
      } catch (error) {
        console.log(`      ⚠️  Could not terminate PID ${pid}`);
      }
    }
    
    console.log(`   ${colors.green}✅ Port ${port} processes terminated${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.green}✅ No processes found${colors.reset}`);
  }
}

/**
 * Kill processes by name pattern
 */
async function killByPattern(pattern, description) {
  process.stdout.write(`🔍 Looking for ${description} processes... `);
  
  try {
    let command;
    
    if (process.platform === 'win32') {
      // Windows: use wmic to find processes
      command = `wmic process where "CommandLine like '%${pattern}%'" get ProcessId /format:value`;
    } else {
      // macOS/Linux: use pgrep
      command = `pgrep -f "${pattern}"`;
    }
    
    const { stdout } = await execAsync(command);
    
    if (!stdout.trim()) {
      console.log(`${colors.green}✅ No processes found${colors.reset}`);
      return;
    }
    
    let pids;
    if (process.platform === 'win32') {
      // Extract PIDs from wmic output
      pids = stdout.split('\n')
        .filter(line => line.includes('ProcessId='))
        .map(line => line.split('=')[1])
        .filter(pid => pid && !isNaN(pid.trim()))
        .map(pid => pid.trim());
    } else {
      // Extract PIDs from pgrep output
      pids = stdout.trim().split('\n').filter(pid => pid);
    }
    
    if (pids.length === 0) {
      console.log(`${colors.green}✅ No processes found${colors.reset}`);
      return;
    }
    
    console.log(`${colors.yellow}Found processes: ${pids.join(', ')}${colors.reset}`);
    
    // Kill processes
    for (const pid of pids) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${pid} /F`);
        } else {
          await execAsync(`kill -TERM ${pid}`);
        }
        console.log(`      ✅ Terminated PID ${pid}`);
      } catch (error) {
        console.log(`      ⚠️  Could not terminate PID ${pid}`);
      }
    }
    
    console.log(`   ${colors.green}✅ All ${description} processes terminated${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.green}✅ No processes found${colors.reset}`);
  }
}

/**
 * Main shutdown function
 */
async function shutdown() {
  console.log('Starting shutdown sequence...');
  console.log('');
  
  // 1. Kill processes on specific ports
  await killPort(3000, 'MCP HTTP Server');
  await killPort(3001, 'WebSocket Server');
  await killPort(5173, 'Vue.js Dev Server');
  await killPort(4173, 'Vue.js Preview Server');
  
  console.log('');
  
  // 2. Kill specific process patterns
  await killByPattern('nodemon.*server/index.js', 'nodemon');
  await killByPattern('server/index.js', 'MCP server');
  await killByPattern('concurrently.*npm run', 'concurrently');
  
  if (process.platform !== 'win32') {
    await killByPattern('vite.*--port 5173', 'Vite dev server');
  }
  
  console.log('');
  console.log(`${colors.green}🎉 All MCP Display server processes have been terminated${colors.reset}`);
  console.log('');
  
  // Verify ports are free
  console.log('🔍 Final verification...');
  
  for (const port of [3000, 3001, 5173, 4173]) {
    try {
      let command;
      if (process.platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -ti:${port}`;
      }
      
      const { stdout } = await execAsync(command);
      
      if (stdout.trim()) {
        console.log(`   ${colors.red}❌ Port ${port} is still in use${colors.reset}`);
      } else {
        console.log(`   ${colors.green}✅ Port ${port} is free${colors.reset}`);
      }
    } catch (error) {
      console.log(`   ${colors.green}✅ Port ${port} is free${colors.reset}`);
    }
  }
  
  console.log('');
  console.log(`${colors.blue}✨ Shutdown complete! You can now restart the servers safely.${colors.reset}`);
  console.log('');
  console.log('To restart:');
  console.log('  npm run dev');
  console.log('');
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\nShutdown script interrupted.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutdown script terminated.');
  process.exit(0);
});

// Run the shutdown process
shutdown().catch((error) => {
  console.error(`${colors.red}Error during shutdown:${colors.reset}`, error.message);
  process.exit(1);
}); 