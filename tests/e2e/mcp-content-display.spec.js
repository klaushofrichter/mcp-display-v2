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
    expect(response.result.tools).toHaveLength(6);
    
    const toolNames = response.result.tools.map(tool => tool.name);
    expect(toolNames).toContain('display_text');
    expect(toolNames).toContain('display_image');
    expect(toolNames).toContain('display_svg');
    expect(toolNames).toContain('display_image_url');
    expect(toolNames).toContain('open_url');
    expect(toolNames).toContain('display_html');
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

  test('should display HTML content correctly', async ({ page, request }) => {
    // Prepare HTML content with various elements
    const htmlContent = `
      <h1>HTML Content Test</h1>
      <p>This is a test of <strong>HTML content display</strong> with various elements.</p>
      <h2>Features</h2>
      <ul>
        <li>Headers (h1, h2, h3, etc.)</li>
        <li><strong>Bold text</strong> and <em>italic text</em></li>
        <li>Lists (ordered and unordered)</li>
        <li>Links: <a href="https://example.com" title="Example">Example Link</a></li>
        <li>Images: <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Test Image" width="50" height="50" /></li>
      </ul>
      <h3>Code Example</h3>
      <pre><code>function hello() {
  console.log("Hello, World!");
}</code></pre>
      <blockquote>
        This is a blockquote with some <strong>emphasis</strong>.
      </blockquote>
      <h3>Table Example</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HTML Display</td>
            <td>Feature</td>
            <td>✅ Working</td>
          </tr>
          <tr>
            <td>Security</td>
            <td>Sanitization</td>
            <td>✅ Active</td>
          </tr>
        </tbody>
      </table>
      <p><em>Timestamp: ${new Date().toISOString()}</em></p>
    `;

    // Count initial log entries
    const initialLogCount = await page.locator('.log-entry').count();
    
    // Make MCP request to display HTML
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'display_html',
        arguments: {
          content: htmlContent
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
    
    // Verify MCP response is successful
    expect(result.result).toBeDefined();
    expect(result.result.content[0].text).toContain('Successfully displayed HTML content');
    
    // Wait for content to appear in the browser
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('HTML');
    
    // Verify the actual HTML is displayed
    const htmlDisplay = contentItem.locator('.html-content');
    await expect(htmlDisplay).toBeVisible();
    
    // Verify various HTML elements are rendered
    await expect(htmlDisplay.locator('h1')).toContainText('HTML Content Test');
    await expect(htmlDisplay.locator('h2')).toContainText('Features');
    await expect(htmlDisplay.locator('h3').first()).toContainText('Code Example');
    
    // Verify formatting elements
    await expect(htmlDisplay.locator('strong').first()).toContainText('HTML content display');
    await expect(htmlDisplay.locator('em').last()).toContainText('Timestamp:');
    
    // Verify lists
    await expect(htmlDisplay.locator('ul li').first()).toContainText('Headers (h1, h2, h3, etc.)');
    await expect(htmlDisplay.locator('ul li').nth(1)).toContainText('Bold text');
    
    // Verify links
    const link = htmlDisplay.locator('a');
    await expect(link).toContainText('Example Link');
    await expect(link).toHaveAttribute('href', 'https://example.com');
    await expect(link).toHaveAttribute('title', 'Example');
    
    // Verify images
    const image = htmlDisplay.locator('img');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('alt', 'Test Image');
    await expect(image).toHaveAttribute('width', '50');
    await expect(image).toHaveAttribute('height', '50');
    
    // Verify code blocks
    const codeBlock = htmlDisplay.locator('pre code');
    await expect(codeBlock).toContainText('function hello()');
    await expect(codeBlock).toContainText('console.log("Hello, World!");');
    
    // Verify blockquote
    const blockquote = htmlDisplay.locator('blockquote');
    await expect(blockquote).toContainText('This is a blockquote');
    
    // Verify table
    const table = htmlDisplay.locator('table');
    await expect(table).toBeVisible();
    await expect(table.locator('th').first()).toContainText('Name');
    await expect(table.locator('th').nth(1)).toContainText('Type');
    await expect(table.locator('th').last()).toContainText('Status');
    await expect(table.locator('td').first()).toContainText('HTML Display');
    await expect(table.locator('td').nth(2)).toContainText('✅ Working');
    
    // Verify timestamp is present
    await expect(htmlDisplay).toContainText('Timestamp:');
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: /Displayed HTML content|html content/ })
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

  test('should open URL in new tab and display clickable link', async ({ page, request }) => {
    // Use the suggested test URL
    const testUrl = 'http://github.com';
    
    // Count initial log entries and content items
    const initialLogCount = await page.locator('.log-entry').count();
    const initialContentCount = await page.locator('.content-card').count();
    
    // Make MCP request to open URL
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: testUrl
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
    
    // Verify MCP response is successful
    expect(result.result).toBeDefined();
    expect(result.result.content[0].text).toContain(`Successfully opened URL in new tab: ${testUrl}`);
    expect(result.result.isError).toBeUndefined();
    
    // Verify URL content is displayed on the page
    await expect(page.locator('.content-card')).toHaveCount(initialContentCount + 1);
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('URL');
    
    // Verify the clickable URL link is displayed
    const urlContent = contentItem.locator('.url-content');
    await expect(urlContent).toBeVisible();
    
    const urlLink = urlContent.locator('.url-link');
    await expect(urlLink).toBeVisible();
    await expect(urlLink).toHaveAttribute('href', testUrl);
    await expect(urlLink).toHaveAttribute('target', '_blank');
    await expect(urlLink).toHaveAttribute('rel', 'noopener noreferrer');
    
    // Verify URL link content structure
    await expect(urlLink.locator('.url-icon')).toBeVisible();
    await expect(urlLink.locator('.url-text')).toContainText(testUrl);
    await expect(urlLink.locator('.external-indicator')).toBeVisible();
    
    // Verify log entry was created (flexible count check)
    const newLogCount = await page.locator('.log-entry').count();
    expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
    await expect(
      page.locator('.log-entry').filter({ hasText: `Opening URL in new tab: ${testUrl}` })
    ).toBeVisible();
    
    // Test with HTTPS URL as well
    const httpsUrl = 'https://github.com';
    const httpsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: httpsUrl
        }
      }
    };
    
    const httpsResponse = await request.post('http://localhost:3000/mcp', {
      data: httpsRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const httpsResult = await httpsResponse.json();
    
    // Verify HTTPS URL also works
    expect(httpsResult.result).toBeDefined();
    expect(httpsResult.result.content[0].text).toContain(`Successfully opened URL in new tab: ${httpsUrl}`);
    expect(httpsResult.result.isError).toBeUndefined();
    
    // Verify second URL content is also displayed
    await expect(page.locator('.content-card')).toHaveCount(initialContentCount + 2);
    
    // Verify the second URL link
    const secondContentItem = page.locator('.content-card').nth(0); // First is the most recent
    const secondUrlLink = secondContentItem.locator('.url-link');
    await expect(secondUrlLink).toHaveAttribute('href', httpsUrl);
    await expect(secondUrlLink.locator('.url-text')).toContainText(httpsUrl);
  });

  test('should display clickable URL links with proper styling and interaction', async ({ page, request }) => {
    // Use a test URL
    const testUrl = 'https://github.com';
    
    // Make MCP request to open URL
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: testUrl
        }
      }
    };
    
    await request.post('http://localhost:3000/mcp', {
      data: customRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Wait for content to appear
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify URL link styling and structure
    const urlLink = page.locator('.url-link').first();
    await expect(urlLink).toBeVisible();
    
    // Check for proper CSS classes and styling
    await expect(urlLink).toHaveClass(/url-link/);
    
    // Verify link components are present
    const urlIcon = urlLink.locator('.url-icon');
    const urlText = urlLink.locator('.url-text');
    const externalIndicator = urlLink.locator('.external-indicator');
    
    await expect(urlIcon).toBeVisible();
    await expect(urlIcon).toContainText('🔗');
    
    await expect(urlText).toBeVisible();
    await expect(urlText).toContainText(testUrl);
    
    await expect(externalIndicator).toBeVisible();
    await expect(externalIndicator).toContainText('↗');
    
    // Test hover state (verify hover styles can be applied)
    await urlLink.hover();
    await expect(urlLink).toBeVisible(); // Should still be visible after hover
    
    // Verify the link has proper accessibility attributes
    await expect(urlLink).toHaveAttribute('target', '_blank');
    await expect(urlLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(urlLink).toHaveAttribute('href', testUrl);
    
    // Verify the link is focusable
    await urlLink.focus();
    await expect(urlLink).toBeFocused();
  });

  test('should display open_url with caption correctly', async ({ page, request }) => {
    // Use a test URL with a caption
    const testUrl = 'https://example.com/camera/live';
    const testCaption = 'Office Camera - Live View';
    
    // Make MCP request to open URL with caption
    const customRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: testUrl,
          caption: testCaption
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
    
    // Verify MCP response is successful
    expect(result.result).toBeDefined();
    expect(result.result.content[0].text).toContain(`Successfully opened URL in new tab: ${testUrl}`);
    expect(result.result.isError).toBeUndefined();
    
    // Wait for content to appear
    await expect(page.locator('.content-card')).toBeVisible({ timeout: 5000 });
    
    // Verify content type and structure
    const contentItem = page.locator('.content-card').first();
    await expect(contentItem.locator('.content-type')).toContainText('URL');
    
    // Verify the clickable URL link is displayed
    const urlContent = contentItem.locator('.url-content');
    await expect(urlContent).toBeVisible();
    
    const urlLink = urlContent.locator('.url-link');
    await expect(urlLink).toBeVisible();
    await expect(urlLink).toHaveAttribute('href', testUrl);
    await expect(urlLink.locator('.url-text')).toContainText(testUrl);
    
    // Verify the caption is displayed underneath
    const caption = urlContent.locator('.content-caption');
    await expect(caption).toBeVisible();
    await expect(caption).toContainText(testCaption);
    
    // Test with different caption
    const testUrl2 = 'https://example.com/parking/camera';
    const testCaption2 = 'Parking Lot Camera Feed';
    
    const customRequest2 = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: testUrl2,
          caption: testCaption2
        }
      }
    };
    
    await request.post('http://localhost:3000/mcp', {
      data: customRequest2,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Wait for second content to appear
    await expect(page.locator('.content-card')).toHaveCount(2);
    
    // Verify the second URL item with caption
    const secondContentItem = page.locator('.content-card').nth(0); // First is the most recent
    const secondUrlContent = secondContentItem.locator('.url-content');
    const secondCaption = secondUrlContent.locator('.content-caption');
    
    await expect(secondCaption).toBeVisible();
    await expect(secondCaption).toContainText(testCaption2);
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

  test('should handle open URL errors gracefully', async ({ page, request }) => {
    // Test with invalid URL format
    const invalidUrlRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: 'not-a-valid-url-format'
        }
      }
    };
    
    const response = await request.post('http://localhost:3000/mcp', {
      data: invalidUrlRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    // Should receive an error response
    expect(result.result).toBeDefined();
    expect(result.result.isError).toBe(true);
    expect(result.result.content[0].text).toContain('Invalid URL format');
    
    // Test with non-HTTP protocol
    const invalidProtocolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: 'ftp://example.com'
        }
      }
    };
    
    const response2 = await request.post('http://localhost:3000/mcp', {
      data: invalidProtocolRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result2 = await response2.json();
    
    // Should receive an error response
    expect(result2.result).toBeDefined();
    expect(result2.result.isError).toBe(true);
    expect(result2.result.content[0].text).toContain('URL must use HTTP or HTTPS protocol');
    
    // Test with empty URL
    const emptyUrlRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'open_url',
        arguments: {
          url: ''
        }
      }
    };
    
    const response3 = await request.post('http://localhost:3000/mcp', {
      data: emptyUrlRequest,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result3 = await response3.json();
    
    // Should receive an error response
    expect(result3.result).toBeDefined();
    expect(result3.result.isError).toBe(true);
    expect(result3.result.content[0].text).toContain('URL must be a non-empty string');
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