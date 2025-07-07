# MCP Display Test Scripts

This directory contains comprehensive test scripts to demonstrate all three MCP display content types.

## Files Created

### Test Scripts
- **`test-mcp-display.sh`** - Bash script for Unix/Linux/macOS
- **`test-mcp-display.js`** - Node.js script for cross-platform compatibility

### Test Assets
- **`test-favicon.svg`** - Custom SVG favicon with animated elements
- **`public/water.png`** - Demo image for testing image display

## What the Tests Cover

### 1. Text Display (`display_text`)
- Multi-line text support
- Unicode emoji support
- Special characters
- Code-like content formatting
- Timestamp and dynamic content

### 2. Image Display (`display_image`)
- Base64-encoded PNG image
- Data URI format validation
- Large file handling (~48KB image)

### 3. SVG Display (`display_svg`)
- Custom SVG with animations
- Complex graphics with multiple elements
- CSS styling and transformations

## Prerequisites

Before running the test scripts, ensure:

1. **Development server is running:**
   ```bash
   npm run dev
   ```

2. **Required dependencies:**
   - For bash script: `curl` and `jq`
   - For Node.js script: Node.js 18+ (uses built-in fetch)

3. **Web interface is open:**
   - Open http://localhost:5173 in your browser
   - Keep it visible to see the content being displayed

## Running the Tests

### Option 1: Bash Script (Unix/Linux/macOS)
```bash
./test-mcp-display.sh
```

### Option 2: Node.js Script (Cross-platform)
```bash
node test-mcp-display.js
# or
./test-mcp-display.js
```

### Option 3: NPM Script
```bash
npm run test:demo
```

## Test Flow

1. **Server Check** - Verifies MCP server is running
2. **Tools List** - Retrieves available MCP tools
3. **Text Test** - Displays formatted text content
4. **Image Test** - Displays the water.png image
5. **SVG Test** - Displays the animated favicon
6. **Summary** - Shows completion status

## Interactive Experience

- The script pauses between each test
- You can see the content appear in real-time on the web interface
- Press Enter to proceed to the next test
- The web interface shows both the content and MCP logs

## Expected Output

### Text Content
A comprehensive text block with:
- Emojis and special characters
- Multi-line formatting
- Current timestamp
- Feature checklist

### Image Content
The water.png image displayed as:
- A properly formatted image card
- Full resolution display
- Base64 data URI format

### SVG Content
An animated favicon showing:
- Monitor with animated connection indicator
- Code representation on screen
- Professional branding elements
- Smooth CSS animations

## Troubleshooting

### Common Issues

1. **Server not running:**
   ```bash
   npm run dev
   ```

2. **Missing dependencies (bash script):**
   ```bash
   # Install jq on macOS
   brew install jq
   
   # Install jq on Ubuntu/Debian
   sudo apt-get install jq
   ```

3. **Permission denied:**
   ```bash
   chmod +x test-mcp-display.sh
   chmod +x test-mcp-display.js
   ```

4. **Image file not found:**
   - Ensure `public/water.png` exists
   - Check file permissions

### Testing Individual Components

You can also test individual tools using curl:

```bash
# Test text display
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "display_text",
      "arguments": {
        "content": "Hello, MCP Display!"
      }
    }
  }'

# Test tools list
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

## Performance Notes

- The image test uses a ~48KB PNG file
- Base64 encoding increases size by ~33%
- WebSocket broadcast handles all content types efficiently
- SVG animations are CSS-based for smooth performance

## Next Steps

After running these tests successfully:
1. Try creating your own content
2. Test with different image formats
3. Experiment with complex SVG graphics
4. Build custom MCP tools using this foundation 