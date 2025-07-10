import { test, expect } from '@playwright/test';

test.describe('MCP Display Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application layout correctly', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText('MCP Display');
    
    // Check sidebar is present
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-header h2')).toContainText('MCP Connections');
    
    // Check main content area
    await expect(page.locator('.main-content')).toBeVisible();
    await expect(page.locator('.clear-button')).toBeVisible();
    
    // Check content area empty state (should always be present initially)
    await expect(page.locator('.content-area .empty-state')).toContainText('No content to display');
  });

  test('should have working clear button', async ({ page }) => {
    // Clear button should be visible and clickable
    const clearButton = page.locator('.clear-button');
    await expect(clearButton).toBeVisible();
    await expect(clearButton).toBeEnabled();
    
    // Click the clear button
    await clearButton.click();
    
    // Should still show empty state (since there's no content)
    await expect(page.locator('.content-area .empty-state')).toContainText('No content to display');
  });

  test('should connect to WebSocket server', async ({ page }) => {
    // Wait for WebSocket connection log
    await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 5000 });
    
    // Check that a connection log entry appears
    const logEntries = page.locator('.log-entry');
    await expect(logEntries.first()).toContainText('Browser connected as');
  });

  test('should display favicon', async ({ page }) => {
    // Check that favicon is set correctly
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', '/favicon.svg');
  });

  test('should have responsive layout', async ({ page }) => {
    // Check that sidebar has fixed width
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveCSS('width', '300px');
    
    // Check that main content takes remaining space
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toHaveCSS('flex', '1 1 0%');
  });

  test('should show connection count in logs', async ({ page }) => {
    // Wait for initial connection
    await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 5000 });
    
    // Check log format
    const logEntry = page.locator('.log-entry').first();
    await expect(logEntry.locator('.log-time')).toBeVisible();
    await expect(logEntry.locator('.log-message')).toBeVisible();
  });

  test('should have clear logs button that clears logs', async ({ page }) => {
    // Check that clear logs button is visible in sidebar
    const clearLogsButton = page.locator('.clear-logs-button');
    await expect(clearLogsButton).toBeVisible();
    await expect(clearLogsButton).toHaveText('Clear Logs');
    
    // Wait for WebSocket connection log entry
    await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 5000 });
    
    // Check that there are log entries initially
    const logEntriesBefore = await page.locator('.log-entry').count();
    expect(logEntriesBefore).toBeGreaterThan(0);
    
    // Click the clear logs button
    await clearLogsButton.click();
    
    // Check that log entries are cleared
    const logEntriesAfter = await page.locator('.log-entry').count();
    expect(logEntriesAfter).toBe(0);
  });
});

test.describe('MCP Display Content Simulation', () => {
  test('should simulate text content display', async ({ page }) => {
    await page.goto('/');
    
    // Wait for WebSocket connection
    await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 5000 });
    
    // Verify initial empty state for content
    await expect(page.locator('.content-area .empty-state')).toContainText('No content to display');
  });

  test('should have proper scrolling for logs and content', async ({ page }) => {
    await page.goto('/');
    
    // Check that sidebar content has scrolling
    const sidebarContent = page.locator('.sidebar-content');
    await expect(sidebarContent).toHaveCSS('overflow-y', 'auto');
    
    // Check that content area has scrolling
    const contentArea = page.locator('.content-area');
    await expect(contentArea).toHaveCSS('overflow-y', 'auto');
  });
}); 

test.describe('MCP Display Client Information', () => {
  test('should display client information in connections log', async ({ page, request }) => {
    // Navigate to the MCP Display page
    await page.goto('http://localhost:5173');
    
    // Wait for initial connection to be established
    await page.waitForSelector('.log-entry', { timeout: 10000 });
    
    // Make an initialize request with client info
    const response = await request.post('http://localhost:3000/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { roots: { listChanged: true } },
          clientInfo: { name: 'claude-code', version: '1.0.44' }
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Verify the initialize request was successful
    expect(response.ok()).toBe(true);
    const responseData = await response.json();
    expect(responseData.result.serverInfo.name).toBe('mcp-display-server');
    
    // Wait for the client connection log to appear
    await page.waitForFunction(() => {
      const logEntries = document.querySelectorAll('.log-entry .log-message');
      return Array.from(logEntries).some(entry => 
        entry.textContent.includes('MCP client connected: claude-code v1.0.44')
      );
    }, { timeout: 5000 });
    
    // Verify the client info appears in the connections log
    const logEntries = await page.locator('.log-entry .log-message').allTextContents();
    const clientLogEntry = logEntries.find(entry => 
      entry.includes('MCP client connected: claude-code v1.0.44')
    );
    
    expect(clientLogEntry).toBeDefined();
    expect(clientLogEntry).toBe('MCP client connected: claude-code v1.0.44');
  });

  test('should display complete initialization flow with initialized notification', async ({ page, request }) => {
    // Navigate to the MCP Display page
    await page.goto('http://localhost:5173');
    
    // Wait for initial connection to be established
    await page.waitForSelector('.log-entry', { timeout: 10000 });
    
    // 1. Initialize with client info
    const initResponse = await request.post('http://localhost:3000/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { roots: {} },
          clientInfo: { name: 'gemini-cli', version: '2.1.0' }
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(initResponse.ok()).toBe(true);
    
    // Wait for initialize log to appear
    await page.waitForFunction(() => {
      const logEntries = document.querySelectorAll('.log-entry .log-message');
      return Array.from(logEntries).some(entry => 
        entry.textContent.includes('MCP client connected: gemini-cli v2.1.0')
      );
    }, { timeout: 5000 });
    
    // 2. Send initialized notification
    const initializedResponse = await request.post('http://localhost:3000/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'initialized'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(initializedResponse.ok()).toBe(true);
    const initializedData = await initializedResponse.json();
    expect(initializedData.result).toBe(null);
    
    // Wait for initialized log to appear
    await page.waitForFunction(() => {
      const logEntries = document.querySelectorAll('.log-entry .log-message');
      return Array.from(logEntries).some(entry => 
        entry.textContent.includes('MCP client ready: gemini-cli v2.1.0')
      );
    }, { timeout: 5000 });
    
    // Verify both logs appear in the connections log
    const logEntries = await page.locator('.log-entry .log-message').allTextContents();
    
    const initLogEntry = logEntries.find(entry => 
      entry.includes('MCP client connected: gemini-cli v2.1.0')
    );
    const readyLogEntry = logEntries.find(entry => 
      entry.includes('MCP client ready: gemini-cli v2.1.0')
    );
    
    expect(initLogEntry).toBeDefined();
    expect(readyLogEntry).toBeDefined();
    expect(initLogEntry).toBe('MCP client connected: gemini-cli v2.1.0');
    expect(readyLogEntry).toBe('MCP client ready: gemini-cli v2.1.0');
  });

  test('should handle proper MCP notifications/initialized method', async ({ page, request }) => {
    // Navigate to the MCP Display page
    await page.goto('http://localhost:5173');
    
    // Wait for initial connection to be established
    await page.waitForSelector('.log-entry', { timeout: 10000 });
    
    // 1. Initialize with client info
    const initResponse = await request.post('http://localhost:3000/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: { roots: {} },
          clientInfo: { name: 'spec-compliant-client', version: '3.0.0' }
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(initResponse.ok()).toBe(true);
    
    // Wait for initialize log to appear
    await page.waitForFunction(() => {
      const logEntries = document.querySelectorAll('.log-entry .log-message');
      return Array.from(logEntries).some(entry => 
        entry.textContent.includes('MCP client connected: spec-compliant-client v3.0.0')
      );
    }, { timeout: 5000 });
    
    // 2. Send proper MCP notifications/initialized (without ID as per spec)
    const initializedResponse = await request.post('http://localhost:3000/mcp', {
      data: {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(initializedResponse.status()).toBe(204); // No Content for true notification
    
    // Wait for initialized log to appear
    await page.waitForFunction(() => {
      const logEntries = document.querySelectorAll('.log-entry .log-message');
      return Array.from(logEntries).some(entry => 
        entry.textContent.includes('MCP client ready: spec-compliant-client v3.0.0')
      );
    }, { timeout: 5000 });
    
    // Verify both logs appear in the connections log
    const logEntries = await page.locator('.log-entry .log-message').allTextContents();
    
    const initLogEntry = logEntries.find(entry => 
      entry.includes('MCP client connected: spec-compliant-client v3.0.0')
    );
    const readyLogEntry = logEntries.find(entry => 
      entry.includes('MCP client ready: spec-compliant-client v3.0.0')
    );
    
    expect(initLogEntry).toBeDefined();
    expect(readyLogEntry).toBeDefined();
    expect(initLogEntry).toBe('MCP client connected: spec-compliant-client v3.0.0');
    expect(readyLogEntry).toBe('MCP client ready: spec-compliant-client v3.0.0');
  });
}); 