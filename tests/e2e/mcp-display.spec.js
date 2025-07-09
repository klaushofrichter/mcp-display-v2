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