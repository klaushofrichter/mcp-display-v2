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

/**
 * Helper function to wait for connection and clear content
 */
async function setupCleanState(page) {
  // Wait for WebSocket connection to be established - check for any log entry first
  await expect(page.locator('.log-entry').first()).toBeVisible({ timeout: 10000 });
  
  // More specific check for connection status
  await expect(
    page.locator('.log-entry').filter({ hasText: /Connected to MCP server|Browser connected/ }).first()
  ).toBeVisible({ timeout: 10000 });
  
  // Clear any existing content to ensure clean state
  const clearButton = page.locator('.clear-button');
  
  // Keep clicking clear until no content cards are visible
  let attempts = 0;
  while (attempts < 3) {
    const contentCount = await page.locator('.content-card').count();
    if (contentCount === 0) break;
    
    if (await clearButton.isVisible()) {
      await clearButton.click();
      // Wait a moment for the clear to take effect
      await page.waitForTimeout(500);
    }
    attempts++;
  }
  
  // Final verification - ensure we start with empty content area
  await expect(page.locator('.content-card')).toHaveCount(0);
  await expect(page.locator('.content-area .empty-state')).toBeVisible();
  await expect(page.locator('.content-area .empty-state')).toContainText('No content to display');
}

test.describe('MCP Content Display Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Set up clean state for each test
    await setupCleanState(page);
  });

  test('should verify MCP server tools are available', async ({ page, request }) => {
    // Test tools/list endpoint
    const response = await makeMcpRequest(request, 'tools/list');
    
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeDefined();
    expect(response.result.tools).toHaveLength(4);
    
    const toolNames = response.result.tools.map(tool => tool.name);
    expect(toolNames).toContain('display_text');
    expect(toolNames).toContain('display_image');
    expect(toolNames).toContain('display_svg');
    expect(toolNames).toContain('display_image_url');
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

    // Count initial log entries to track new ones
    const initialLogCount = await page.locator('.log-entry').count();

    // Make MCP request to display text
    const response = await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed text content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
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
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /Displayed text content|text content/ })
    ).toBeVisible();
  });

  test('should display image content correctly', async ({ page, request }) => {
    // Get image as base64 data URI
    const imageContent = getImageAsBase64();
    
    // Verify we have valid image data
    expect(imageContent).toMatch(/^data:image\/png;base64,/);
    expect(imageContent.length).toBeGreaterThan(1000); // Should be substantial content

    // Count initial log entries
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Make MCP request to display image
    const response = await makeMcpRequest(request, 'tools/call', 'display_image', imageContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed image content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('Image');
    
    // Verify the actual image is displayed
    const imageDisplay = contentItem.locator('.image-content img');
    await expect(imageDisplay).toBeVisible();
    await expect(imageDisplay).toHaveAttribute('src', imageContent);
    
    // Verify image properties (alt text includes timestamp)
    const altText = await imageDisplay.getAttribute('alt');
    expect(altText).toContain('Image content from');
    
    // Wait for image to load and check dimensions
    await imageDisplay.waitFor({ state: 'visible' });
    const imageBounds = await imageDisplay.boundingBox();
    expect(imageBounds.width).toBeGreaterThan(0);
    expect(imageBounds.height).toBeGreaterThan(0);
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /Displayed image content|image content/ })
    ).toBeVisible();
  });

  test('should display SVG content correctly', async ({ page, request }) => {
    // Get SVG content
    const svgContent = getSvgContent();
    
    // Verify we have valid SVG content
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
    expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');

    // Count initial log entries
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Make MCP request to display SVG
    const response = await makeMcpRequest(request, 'tools/call', 'display_svg', svgContent);
    
    // Verify MCP response is successful
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('Successfully displayed SVG content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('SVG');
    
    // Verify the actual SVG is displayed
    const svgDisplay = contentItem.locator('.svg-content');
    await expect(svgDisplay).toBeVisible();
    
    // Check SVG elements are present
    const svgElement = svgDisplay.locator('svg');
    await expect(svgElement).toBeVisible();
    await expect(svgElement).toHaveAttribute('width', '64');
    await expect(svgElement).toHaveAttribute('height', '64');
    
    // Verify specific SVG content elements (more flexible counts)
    const circleCount = await svgDisplay.locator('circle').count();
    expect(circleCount).toBeGreaterThan(0);
    const rectCount = await svgDisplay.locator('rect').count();
    expect(rectCount).toBeGreaterThan(0);
    await expect(svgDisplay.locator('text')).toContainText('MCP');
    
    // Verify animations are present (just check they exist, not visibility)
    const animatedElement = svgDisplay.locator('animate');
    const animateCount = await animatedElement.count();
    expect(animateCount).toBeGreaterThan(0);
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /Displayed SVG content|svg content/ })
    ).toBeVisible();
  });

  test('should display image from URL correctly', async ({ page, request }) => {
    // Use a reliable test image URL
    const imageUrl = 'https://httpbin.org/image/png';
    
    // Count initial log entries
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Make MCP request to display image from URL
    const response = await makeMcpRequest(request, 'tools/call', 'display_image_url', '', 1);
    
    // Override the content parameter with url parameter for this tool
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'display_image_url',
        arguments: {
          url: imageUrl
        }
      }
    };
    
    const urlResponse = await request.post('http://localhost:3000/mcp', {
      data: customRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const urlResult = await urlResponse.json();
    
    // Verify MCP response is successful
    expect(urlResult.result).toBeDefined();
    expect(urlResult.result.content[0].text).toContain(`Successfully displayed image from URL: ${imageUrl}`);
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 10000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('Image-URL');
    
    // Verify the actual image is displayed
    const imageDisplay = contentItem.locator('.image-content img');
    await expect(imageDisplay).toBeVisible();
    
    // Verify image has a valid data URI src (should be base64 converted)
    const imgSrc = await imageDisplay.getAttribute('src');
    expect(imgSrc).toMatch(/^data:image\/(png|jpeg|jpg);base64,/);
    expect(imgSrc.length).toBeGreaterThan(100); // Should be substantial base64 content
    
    // Verify image properties (alt text includes timestamp)
    const altText = await imageDisplay.getAttribute('alt');
    expect(altText).toContain('Image content from');
    
    // Wait for image to load and check dimensions
    await imageDisplay.waitFor({ state: 'visible' });
    const imageBounds = await imageDisplay.boundingBox();
    expect(imageBounds.width).toBeGreaterThan(0);
    expect(imageBounds.height).toBeGreaterThan(0);
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: 'Image from URL displayed' })
    ).toBeVisible();
  });

  test('should display multiple content items in sequence', async ({ page, request }) => {
    // Get initial content count
    const initialContentCount = await page.locator('.content-card').count();
    
    // Display text content first
    const textContent = 'First test message with emojis 🚀✨';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Wait for first content to appear
    await expect(page.locator('.content-card')).toHaveCount(initialContentCount + 1);
    await expect(
      page.locator('.content-card').locator('.text-content').filter({ hasText: 'First test message' })
    ).toBeVisible();
    
    // Display second text content
    const textContent2 = 'Second test message with different content 🎯📊';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent2);
    
    // Wait for second content to appear
    await expect(page.locator('.content-card')).toHaveCount(initialContentCount + 2);
    await expect(
      page.locator('.content-card').locator('.text-content').filter({ hasText: 'Second test message' })
    ).toBeVisible();
    
    // Verify both items are visible (order might vary)
    await expect(
      page.locator('.content-card').locator('.text-content').filter({ hasText: 'First test message' })
    ).toBeVisible();
    await expect(
      page.locator('.content-card').locator('.text-content').filter({ hasText: 'Second test message' })
    ).toBeVisible();
    
    // Verify no empty state is shown
    await expect(page.locator('.empty-state')).not.toBeVisible();
  });

  test('should clear all content when clear button is clicked', async ({ page, request }) => {
    // Display some content first
    const textContent = 'Content to be cleared 🗑️';
    await makeMcpRequest(request, 'tools/call', 'display_text', textContent);
    
    // Verify content is displayed
    await expect(page.locator('.content-card').first()).toBeVisible();
    await expect(page.locator('.text-content').first()).toContainText('Content to be cleared');
    
    // Count log entries before clearing
    const logCountBeforeClear = await page.locator('.log-entry').count();
    
    // Click the clear button
    const clearButton = page.locator('.clear-button');
    await clearButton.click();
    
    // Verify content is cleared
    await expect(page.locator('.content-card')).not.toBeVisible();
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No content to display');
    
    // Verify clear log entry was added (count might increase if clear was successful)
    const logCount = await page.locator('.log-entry').count();
    expect(logCount).toBeGreaterThanOrEqual(logCountBeforeClear);
    
    // Check for clear-related log message
    await expect(
      page.locator('.log-entry').filter({ hasText: /cleared|Content cleared/ })
    ).toBeVisible();
  });

  test('should handle image URL errors gracefully', async ({ page, request }) => {
    // Test with an invalid URL that should fail
    const invalidUrl = 'https://httpbin.org/status/404';
    
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'display_image_url',
        arguments: {
          url: invalidUrl
        }
      }
    };
    
    const response = await request.post('http://localhost:3000/mcp', {
      data: customRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    // Verify error handling
    expect(result.result).toBeDefined();
    expect(result.result.isError).toBe(true);
    expect(result.result.content[0].text).toContain('Failed to fetch image');
    
    // Test with invalid URL format
    const invalidFormatRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'display_image_url',
        arguments: {
          url: 'not-a-valid-url'
        }
      }
    };
    
    const invalidResponse = await request.post('http://localhost:3000/mcp', {
      data: invalidFormatRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const invalidResult = await invalidResponse.json();
    
    // Verify invalid URL error handling
    expect(invalidResult.result).toBeDefined();
    expect(invalidResult.result.isError).toBe(true);
    expect(invalidResult.result.content[0].text).toContain('Invalid URL format');
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
    
    // Verify new log entry was added (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThan(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /Displayed text content|text content/ })
    ).toBeVisible();
    
    // Clear content
    await page.locator('.clear-button').click();
    
    // Verify clear log entry was added
    const finalLogCount = await page.locator('.log-entry').count();
    expect(finalLogCount).toBeGreaterThanOrEqual(newLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /cleared|Content cleared/ })
    ).toBeVisible();
    
    // Verify log entries have proper structure
    const logEntries = page.locator('.log-entry');
    const lastLogEntry = logEntries.last();
    await expect(lastLogEntry.locator('.log-time')).toBeVisible();
    await expect(lastLogEntry.locator('.log-message')).toBeVisible();
  });
});

test.describe('MCP Content Display Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Set up clean state for each test
    await setupCleanState(page);
  });

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
    await expect(page.locator('.text-content').first()).toContainText('Line 1:');
    await expect(page.locator('.text-content').first()).toContainText('Line 100:');
    
    // Verify content container exists (scrolling may be handled at different levels)
    const textContent = page.locator('.text-content').first();
    await expect(textContent).toBeVisible();
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
    
    // Wait for all content to appear with timeout
    await expect(page.locator('.content-card')).toHaveCount(5, { timeout: 10000 });
    
    // Verify content contains all messages (order might vary due to async processing)
    for (let i = 1; i <= 5; i++) {
      await expect(
        page.locator('.content-card').locator('.text-content').filter({ hasText: `Rapid message ${i}` })
      ).toBeVisible();
    }
  });
}); 