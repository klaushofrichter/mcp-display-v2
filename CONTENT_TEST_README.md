# MCP Content Display Playwright Tests

This document describes the comprehensive Playwright test suite for validating MCP content display functionality in the browser.

## Test File: `tests/e2e/mcp-content-display.spec.js`

### Overview

This test suite performs **end-to-end integration testing** by:
1. Making actual MCP JSON-RPC requests to the server
2. Verifying content appears correctly in the browser UI
3. Testing all three content types (text, image, SVG)
4. Validating real-time updates and error handling

### Test Categories

#### 🧪 Integration Tests (`MCP Content Display Integration Tests`)

1. **`should verify MCP server tools are available`**
   - Tests `tools/list` endpoint
   - Verifies all three tools are available
   - Validates tool names and count

2. **`should display text content correctly`**
   - Uses the same text content as `test-mcp-display.js`
   - Tests multi-line text, emojis, special characters
   - Verifies content appears in browser with proper formatting
   - Checks log entries are created

3. **`should display image content correctly`**
   - Reads `public/water.png` and converts to base64
   - Tests large image handling (~48KB)
   - Verifies image displays with correct attributes
   - Validates image dimensions and loading

4. **`should display SVG content correctly`**
   - Uses the custom `test-favicon.svg` file
   - Tests SVG parsing and rendering
   - Verifies SVG elements (circles, rectangles, text)
   - Checks animations are present

5. **`should display multiple content items in sequence`**
   - Tests displaying multiple items
   - Verifies correct ordering
   - Ensures no empty state when content exists

6. **`should clear all content when clear button is clicked`**
   - Tests the clear functionality
   - Verifies content removal and empty state restoration

7. **`should handle content display errors gracefully`**
   - Tests invalid image data
   - Tests invalid SVG content
   - Verifies proper error responses

8. **`should show real-time log updates for all operations`**
   - Tests log entry creation
   - Verifies log structure and timing
   - Tests clear operation logging

#### ⚡ Performance Tests (`MCP Content Display Performance Tests`)

1. **`should handle large text content efficiently`**
   - Tests with 10KB+ text content
   - Measures performance (< 5 seconds)
   - Verifies scrolling with large content

2. **`should handle rapid successive content updates`**
   - Tests 5 rapid sequential requests
   - Verifies all content displays correctly
   - Tests content ordering under load

## Content Used

### Text Content
```javascript
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
```

### Image Content
- Uses `public/water.png` (48KB PNG file)
- Converts to base64 data URI format
- Tests real-world image display

### SVG Content
- Uses `test-favicon.svg` (animated MCP favicon)
- Contains complex graphics with animations
- Tests SVG parsing and rendering

## Running the Tests

### Option 1: Run All Content Display Tests
```bash
npm run test:content
```

### Option 2: Run Specific Test Project
```bash
npx playwright test --project=content-display
```

### Option 3: Run with UI Mode
```bash
npx playwright test tests/e2e/mcp-content-display.spec.js --ui
```

### Option 4: Run Specific Test
```bash
npx playwright test -g "should display text content correctly"
```

## Prerequisites

1. **Development server must be running:**
   ```bash
   npm run dev
   ```

2. **Test assets must exist:**
   - `public/water.png` - Demo image
   - `test-favicon.svg` - SVG test content

3. **MCP server endpoints must be operational:**
   - `http://localhost:3000/mcp` - JSON-RPC endpoint
   - `http://localhost:3001` - WebSocket server
   - `http://localhost:5173` - Vue.js frontend

## Test Architecture

### Helper Functions

1. **`makeMcpRequest(request, method, toolName, content, requestId)`**
   - Makes JSON-RPC requests to MCP server
   - Handles both `tools/list` and `tools/call` methods
   - Returns parsed JSON response

2. **`getImageAsBase64()`**
   - Reads `public/water.png`
   - Converts to base64 data URI
   - Handles file reading errors

3. **`getSvgContent()`**
   - Reads `test-favicon.svg`
   - Returns raw SVG markup
   - Handles file reading errors

### Test Flow

1. **Setup** - Navigate to app, wait for WebSocket connection
2. **Request** - Make MCP JSON-RPC request
3. **Verify Response** - Check MCP server response
4. **Wait for UI** - Wait for content to appear in browser
5. **Validate Display** - Verify content renders correctly
6. **Check Logs** - Ensure log entries are created

## What This Tests Validates

### ✅ MCP Protocol Compliance
- JSON-RPC 2.0 request/response format
- Proper tool registration and listing
- Error handling and validation

### ✅ Content Display Functionality
- Text formatting preservation
- Image loading and display
- SVG parsing and rendering
- Animation support

### ✅ Real-time Communication
- WebSocket connectivity
- Live content updates
- Log streaming

### ✅ User Interface
- Content area updates
- Clear button functionality
- Responsive layout
- Error state handling

### ✅ Performance
- Large content handling
- Rapid update processing
- Memory management
- Rendering efficiency

## Debugging

### Common Issues

1. **Server not running:**
   ```bash
   npm run dev
   ```

2. **Test timeouts:**
   - Increase timeout in test configuration
   - Check server logs for errors

3. **File not found errors:**
   - Verify `public/water.png` exists
   - Verify `test-favicon.svg` exists

4. **WebSocket connection issues:**
   - Check port 3001 is available
   - Verify WebSocket server is running

### Debug Mode

Run tests with debug output:
```bash
DEBUG=pw:api npx playwright test tests/e2e/mcp-content-display.spec.js
```

### View Test Report

After running tests:
```bash
npx playwright show-report
```

## Continuous Integration

These tests are designed to run in CI environments:
- Automatically starts development server
- Uses headless browsers
- Generates HTML reports
- Handles retries on failure

## Integration with Other Tests

This test suite complements:
- **Unit tests** (`tests/unit/`) - Test individual components
- **Basic E2E tests** (`tests/e2e/mcp-display.spec.js`) - Test UI layout
- **Demo scripts** (`test-mcp-display.js`) - Manual testing and demonstration

Together, they provide comprehensive coverage of the MCP Display application. 