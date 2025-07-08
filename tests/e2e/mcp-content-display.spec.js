import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP endpoint configuration
const MCP_ENDPOINT = 'http://localhost:3000/mcp';

/**
 * Helper function to make MCP requests
 */
async function makeMcpRequest(request, method, toolName = '', content = '', requestId = Math.floor(Math.random() * 1000)) {
  const requestBody = {
    jsonrpc: '2.0',
    id: requestId,
    method: method,
    params: method === 'tools/list' ? {} : {
      name: toolName,
      arguments: {
        content: content
      }
    }
  };

  const response = await request.post(MCP_ENDPOINT, {
    data: requestBody,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
}

/**
 * Helper function to read image as base64
 */
function getImageAsBase64() {
  try {
    const imagePath = path.resolve(__dirname, '../../public/water.png');
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    throw new Error(`Failed to read image: ${error.message}`);
  }
}

/**
 * Helper function to read SVG content
 */
function getSvgContent() {
  try {
    const svgPath = path.resolve(__dirname, '../../test-favicon.svg');
    return fs.readFileSync(svgPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read SVG: ${error.message}`);
  }
}

test.describe('MCP Content Display Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for WebSocket connection to be established
    await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.log-entry')).toContainText(/Connected to MCP server|Browser connected as/);
    
    // Ensure we start with empty content area
    await expect(page.locator('.content-area .empty-state')).toContainText('No content to display');
  });

  test('should verify MCP server tools are available', async ({ page, request }) => {
    // Test tools/list endpoint
    const response = await makeMcpRequest(request, 'tools/list');
    
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeDefined();
    expect(response.result.tools).toHaveLength(3);
    
    const toolNames = response.result.tools.map(tool => tool.name);
    expect(toolNames).toContain('display_text');
    expect(toolNames).toContain('display_image');
    expect(toolNames).toContain('display_svg');
  });

  test('should display text content correctly', async ({ page, request }) => {
    const textContent = `🎉 MCP Display Test - Text Content

This is a comprehensive test of the text display functionality.

Features being tested:
✅ Multi-line text support
✅ Unicode emoji support  
✅ Special characters: !@#$%^&*()
✅ Code-like content: const message = 'Hello, World!';
✅ Different text lengths and formatting

Timestamp: ${new Date().toISOString()}
Status: All systems operational`;

    // Make MCP request to display text
    const response = await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed text content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').last();
    await expect(contentItem.locator('.content-type')).toContainText('Text');
    
    // Verify the actual text content is displayed
    const textDisplay = contentItem.locator('.text-content');
    await expect(textDisplay).toBeVisible();
    await expect(textDisplay).toContainText('🎉 MCP Display Test - Text Content');
    await expect(textDisplay).toContainText('Multi-line text support');
    await expect(textDisplay).toContainText('const message = \'Hello, World!\';');
    await expect(textDisplay).toContainText('All systems operational');
    
    // Verify text preserves formatting
    const textElement = await textDisplay.textContent();
    expect(textElement).toContain('Features being tested:');
    expect(textElement).toContain('✅ Unicode emoji support');
    
    // Check that the content timestamp shows it's real-time
    await expect(textDisplay).toContainText('Timestamp:');
    
    // Verify log entry was created
    const logEntries = page.locator('.log-entry');
    await expect(logEntries.last()).toContainText('Displayed text content');
  });

  test('should display image content correctly', async ({ page, request }) => {
    // Get image as base64 data URI
    const imageContent = getImageAsBase64();
    
    // Verify we have valid image data
    expect(imageContent).toMatch(/^data:image\/png;base64,/);
    expect(imageContent.length).toBeGreaterThan(1000); // Should be substantial content
    
    // Make MCP request to display image
    const response = await makeMcpRequest(request, 'tools/call', 'display_image', imageContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed image content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').last();
    await expect(contentItem.locator('.content-type')).toContainText('Image');
    
    // Verify the actual image is displayed
    const imageDisplay = contentItem.locator('.image-content img');
    await expect(imageDisplay).toBeVisible();
    await expect(imageDisplay).toHaveAttribute('src', imageContent);
    
    // Verify image properties
    await expect(imageDisplay).toHaveAttribute('alt', 'Displayed content');
    
    // Wait for image to load and check dimensions
    await imageDisplay.waitFor({ state: 'visible' });
    const imageBounds = await imageDisplay.boundingBox();
    expect(imageBounds.width).toBeGreaterThan(0);
    expect(imageBounds.height).toBeGreaterThan(0);
    
    // Verify log entry was created
    const logEntries = page.locator('.log-entry');
    await expect(logEntries.last()).toContainText('Displayed image content');
  });

  test('should display SVG content correctly', async ({ page, request }) => {
    // Get SVG content
    const svgContent = getSvgContent();
    
    // Verify we have valid SVG content
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
    expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
    
    // Make MCP request to display SVG
    const response = await makeMcpRequest(request, 'tools/call', 'display_svg', svgContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed SVG content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').last();
    await expect(contentItem.locator('.content-type')).toContainText('SVG');
    
    // Verify the actual SVG is displayed
    const svgDisplay = contentItem.locator('.svg-content');
    await expect(svgDisplay).toBeVisible();
    
    // Check SVG elements are present
    const svgElement = svgDisplay.locator('svg');
    await expect(svgElement).toBeVisible();
    await expect(svgElement).toHaveAttribute('width', '64');
    await expect(svgElement).toHaveAttribute('height', '64');
    
    // Verify specific SVG content elements
    await expect(svgDisplay.locator('circle')).toHaveCount(4); // Background + indicator circles
    await expect(svgDisplay.locator('rect')).toHaveCount(9); // Monitor parts + code lines
    await expect(svgDisplay.locator('text')).toContainText('MCP');
    
    // Verify animations are present
    const animatedElement = svgDisplay.locator('animate');
    await expect(animatedElement).toBeVisible();
    
    // Verify log entry was created
    const logEntries = page.locator('.log-entry');
    await expect(logEntries.last()).toContainText('Displayed SVG content');
  });

  test('should display multiple content items in sequence', async ({ page, request }) => {
    // Display text content first
    const textContent = 'First test message with emojis 🚀✨';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Wait for first content to appear
    await expect(page.locator('.content-card')).toHaveCount(1);
    await expect(page.locator('.content-card').first().locator('.text-content')).toContainText('First test message');
    
    // Display second text content
    const textContent2 = 'Second test message with different content 🎯📊';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent2);
    
    // Wait for second content to appear
    await expect(page.locator('.content-card')).toHaveCount(2);
    await expect(page.locator('.content-card').last().locator('.text-content')).toContainText('Second test message');
    
    // Verify both items are visible and in correct order
    const contentItems = page.locator('.content-card');
    await expect(contentItems.nth(0).locator('.text-content')).toContainText('First test message');
    await expect(contentItems.nth(1).locator('.text-content')).toContainText('Second test message');
    
    // Verify no empty state is shown
    await expect(page.locator('.empty-state')).not.toBeVisible();
  });

  test('should clear all content when clear button is clicked', async ({ page, request }) => {
    // Display some content first
    const textContent = 'Content to be cleared 🗑️';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Verify content is displayed
    await expect(page.locator('.content-card')).toBeVisible();
    await expect(page.locator('.text-content')).toContainText('Content to be cleared');
    
    // Click the clear button
    const clearButton = page.locator('.clear-button');
    await clearButton.click();
    
    // Verify content is cleared
    await expect(page.locator('.content-card')).not.toBeVisible();
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No content to display');
  });

  test('should handle content display errors gracefully', async ({ page, request }) => {
    // Test with invalid image data
    const invalidImageContent = 'invalid-image-data';
    const response = await makeMcpRequest(request, 'tools/call', 'display_image', invalidImageContent);
    
    // Should receive an error response (or success with error in result)
    if (response.error) {
      expect(response.error.message).toContain('Invalid image data URI format');
    } else {
      expect(response.result.content[0].text).toContain('Error:');
    }
    
    // Browser should not display any new content
    await expect(page.locator('.content-card')).not.toBeVisible();
    await expect(page.locator('.empty-state')).toBeVisible();
    
    // Test with invalid SVG data
    const invalidSvgContent = '<invalid>not valid svg</invalid>';
    const response2 = await makeMcpRequest(request, 'tools/call', 'display_svg', invalidSvgContent);
    
    // Should receive an error response (or success with error in result)
    if (response2.error) {
      expect(response2.error.message).toContain('Invalid SVG content format');
    } else {
      expect(response2.result.content[0].text).toContain('Error:');
    }
  });

  test('should show real-time log updates for all operations', async ({ page, request }) => {
    // Count initial log entries
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Display text content
    await makeMcpRequest(request, 'tools/call', 'display_text', 'Test message for logs');
    
    // Verify new log entry was added
    await expect(page.locator('.log-entry')).toHaveCount(initialLogCount + 1);
    await expect(page.locator('.log-entry').last()).toContainText('Displayed text content');
    
    // Clear content
    await page.locator('.clear-button').click();
    
    // Verify clear log entry was added
    await expect(page.locator('.log-entry')).toHaveCount(initialLogCount + 2);
    await expect(page.locator('.log-entry').last()).toContainText('Content cleared');
    
    // Verify log entries have proper structure
    const lastLogEntry = page.locator('.log-entry').last();
    await expect(lastLogEntry.locator('.log-time')).toBeVisible();
    await expect(lastLogEntry.locator('.log-message')).toBeVisible();
  });
});

test.describe('MCP Content Display Performance Tests', () => {
  test('should handle large text content efficiently', async ({ page, request }) => {
    // Create large text content (simulate real-world usage)
    const largeTextContent = Array.from({ length: 100 }, (_, i) => 
      `Line ${i + 1}: This is a substantial amount of text content to test performance. `.repeat(5)
    ).join('\n');
    
    expect(largeTextContent.length).toBeGreaterThan(10000);
    
    // Measure performance
    const startTime = Date.now();
    
    // Make MCP request
    await makeMcpRequest(request, 'tools/call', 'display_text', largeTextContent);
    
    // Wait for content to appear
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 10000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (less than 5 seconds)
    expect(duration).toBeLessThan(5000);
    
    // Verify content is displayed correctly
    await expect(page.locator('.text-content')).toContainText('Line 1:');
    await expect(page.locator('.text-content')).toContainText('Line 100:');
    
    // Verify scrolling works with large content
    const textContent = page.locator('.text-content');
    await expect(textContent).toHaveCSS('overflow-y', 'auto');
  });

  test('should handle rapid successive content updates', async ({ page, request }) => {
    // Send multiple requests in quick succession
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        makeMcpRequest(request, 'tools/call', 'display_text', `Rapid message ${i + 1} 🚀`)
      );
    }
    
    // Wait for all requests to complete
    await Promise.all(promises);
    
    // Verify all content items are displayed
    await expect(page.locator('.content-card')).toHaveCount(5);
    
    // Verify content is in correct order
    for (let i = 0; i < 5; i++) {
      await expect(page.locator('.content-card').nth(i).locator('.text-content'))
        .toContainText(`Rapid message ${i + 1}`);
    }
  });
}); 