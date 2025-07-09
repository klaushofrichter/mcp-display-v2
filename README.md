# MCP Display v2

A Model Context Protocol (MCP) server with HTTP transport that provides real-time display capabilities for text, images, and SVG content through a modern Vue.js web interface.

This is a second attempt for an MCP display. The [first attempt](https://github.com/klaushofrichter/mcp-display) ran into a dead end.

A PRD is [here](https://github.com/klaushofrichter/mcp-display-v2/blob/develop/prd.md).

## Features

- **MCP Server with HTTP Transport**: Full Model Context Protocol implementation
- **Real-time Display**: WebSocket-based live updates to browser interface
- **Multiple Content Types**: Support for text, base64 images, and SVG content
- **Modern UI**: Vue.js 3 single-page application with responsive design
- **Connection Monitoring**: Live log of MCP client connections and activities
- **Clear Functionality**: One-click content clearing capability

## Installation

### Prerequisites

- Node.js 20.19.0 or better
- npm (comes with Node.js)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/mcp-display-v2.git
cd mcp-display-v2
```

2. Install dependencies for both server and client:
```bash
npm run install:all
```

### Development

Start the development server (both MCP server and Vue.js client):
```bash
npm run dev
```

This will start:
- MCP server on `http://localhost:3000`
- WebSocket server on `ws://localhost:3001`
- Vue.js development server on `http://localhost:5173`

Stop all servers:
```bash
npm run stop
```

For forceful shutdown (if processes don't terminate gracefully):
```bash
npm run stop:force
```

### Production Build

Build the client application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Configuration

### Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `WS_PORT`: WebSocket server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### MCP Client Configuration

To connect an MCP client to this server, use the HTTP transport with:
- **Endpoint**: `http://localhost:3000/mcp`
- **Method**: POST
- **Content-Type**: application/json

Example MCP client configuration:
```json
{
  "transport": "http",
  "url": "http://localhost:3000/mcp"
}
```

#### Claude Code Configuration

Claude Code connects to MCP servers via HTTP transport. There are two ways to configure it:

**Option 1: Using the built-in MCP management commands (Recommended)**

First, start your MCP display server:
```bash
npm run dev
```

Then add the MCP server to Claude Code:
```bash
claude mcp add-json mcp-display '{"type":"http","url":"http://localhost:3000/mcp","description":"A MCP server that offers tools for display of text, image and SVG"}'
```

**Option 2: Using configuration file**

Add the following to your Claude Code configuration file:

**Location of config file:**
- macOS: `~/.claude.json`

**Configuration:**
```json
{
  "mcpServers": {
    "mcp-display": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "description": "A MCP server that offers tools for display of text, image and SVG"
    }
  }
}
```

**Important:** The MCP display server must be running (`npm run dev`) before connecting Claude Code.

#### Gemini CLI Configuration

To configure Gemini CLI to use this MCP server, you have several options:

**Option 1: Using HTTP transport directly**
```bash
# Start the MCP display server first
npm run dev

# Then connect Gemini CLI with HTTP transport
gemini-cli --mcp-server http://localhost:3000/mcp
```

**Option 2: Using configuration file**

Create or edit your Gemini CLI configuration file with:
```json
{
  "mcpServers": {
    "display": {
      "transport": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Option 3: Using command line arguments**
```bash
gemini-cli --mcp-transport http --mcp-url http://localhost:3000/mcp
```

**Available Tools:**
Once connected, both Claude Code and Gemini CLI will have access to these tools:
- `display_text` - Display text content in the browser
- `display_image` - Display base64-encoded images
- `display_svg` - Display SVG graphics
- `display_image_url` - Display images from URLs (fetches and converts to base64)

## Software Structure

### Project Architecture

```
mcp-display-v2/
├── server/                 # Node.js MCP Server
│   ├── index.js           # Main server entry point
│   ├── mcpServer.js       # MCP protocol implementation
│   └── webSocketServer.js # WebSocket communication
├── client/                # Vue.js Frontend
│   ├── src/
│   │   ├── App.vue        # Main Vue component
│   │   ├── main.js        # Vue app entry point
│   │   └── style.css      # Application styles
│   ├── public/
│   │   └── favicon.svg    # Monitor icon
│   └── index.html         # HTML entry point
├── tests/
│   ├── unit/              # Jest unit tests
│   └── e2e/               # Playwright e2e tests
└── package.json           # Project configuration
```

### Backend Components

1. **MCP Server** (`server/mcpServer.js`)
   - Implements Model Context Protocol specification
   - Provides four tools: `display_text`, `display_image`, `display_svg`, `display_image_url`
   - Handles HTTP transport for MCP communication
   - Validates and processes content before display

2. **WebSocket Server** (`server/webSocketServer.js`)
   - Manages real-time communication with browser clients
   - Broadcasts content updates to connected browsers
   - Handles client connection/disconnection events
   - Provides connection logging and health monitoring

3. **Main Server** (`server/index.js`)
   - Express.js HTTP server setup
   - Security middleware (Helmet, CORS)
   - Health check endpoint (`/health`)
   - Graceful shutdown handling

### Frontend Components

1. **Vue.js Application** (`client/src/App.vue`)
   - Responsive two-panel layout (sidebar + main content)
   - Real-time WebSocket connection handling
   - Content display with type-specific rendering
   - Connection log management with automatic cleanup

2. **Styling** (`client/src/style.css`)
   - Modern, accessible design system
   - Responsive layout with proper scrolling
   - Content cards with metadata display
   - Dark sidebar with light main content area

### Available MCP Tools

#### `display_text`
- **Purpose**: Display ASCII text content
- **Input**: `content` (string) - The text to display
- **Validation**: Must be non-empty string
- **Output**: Text displayed in monospace font with proper wrapping

#### `display_image`
- **Purpose**: Display base64-encoded images
- **Input**: `content` (string) - Base64 data URI (e.g., `data:image/png;base64,...`)
- **Validation**: Must start with `data:image/`
- **Output**: Image displayed with responsive sizing

#### `display_svg`
- **Purpose**: Display SVG graphics
- **Input**: `content` (string) - SVG markup
- **Validation**: Must contain `<svg` tag
- **Output**: SVG rendered inline with proper scaling

## Testing

### Unit Tests

Run Jest unit tests for server components:
```bash
npm run test:unit
```

Tests cover:
- MCP server tool implementations
- WebSocket server functionality
- Error handling and validation
- Content type processing

### End-to-End Tests

Run Playwright browser tests:
```bash
npm run test:e2e
```

Tests verify:
- Application layout and UI components
- WebSocket connection establishment
- Content display functionality
- Responsive design elements
- User interaction features

### All Tests

Run complete test suite:
```bash
npm test
```

### Test Configuration

- **Jest**: Configured for ES modules with Node.js environment
- **Playwright**: Uses Chromium browser for cross-platform compatibility
- **Coverage**: Tracks server-side code coverage automatically

## API Endpoints

### MCP Endpoints

- **POST** `/mcp` - Main MCP protocol endpoint
- **GET** `/mcp/info` - Server information and capabilities

### Health Monitoring

- **GET** `/health` - Server health check

### WebSocket

- **WS** `ws://localhost:3001` - Real-time browser communication

## Usage Examples

### Text Display

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "display_text",
      "arguments": {
        "content": "Hello, World!\nThis is a multi-line text display."
      }
    }
  }'
```

### Image Display

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "display_image",
      "arguments": {
        "content": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
      }
    }
  }'
```

### SVG Display

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "display_svg",
      "arguments": {
        "content": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"blue\"/></svg>"
      }
    }
  }'
```

### Image URL Display

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "display_image_url",
      "arguments": {
        "url": "https://httpbin.org/image/png"
      }
    }
  }'
```

## Browser Interface

Access the web interface at `http://localhost:5173` during development or the configured port in production.

### Interface Layout

- **Left Sidebar**: MCP connection logs and activity monitor
- **Main Area**: Content display with type indicators and timestamps
- **Clear Button**: Removes all displayed content
- **Responsive Design**: Adapts to different screen sizes

### Content Display

- **Text**: Monospace font with syntax highlighting
- **Images**: Responsive with automatic scaling (base64 or URL sources)
- **SVG**: Vector graphics with proper scaling
- **Image URLs**: Automatically fetched and converted to base64 display
- **Metadata**: Type and timestamp for each content item

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Change PORT and WS_PORT environment variables
2. **WebSocket Connection Failed**: Ensure both servers are running
3. **Content Not Displaying**: Check browser console for WebSocket errors
4. **MCP Client Connection**: Verify endpoint URL and HTTP method
5. **Servers Won't Stop**: Use the shutdown scripts to force termination
6. **Claude Code "Internal error" (-32603)**: Make sure the MCP display server is running first with `npm run dev`

### Server Shutdown Issues

If you're experiencing issues with servers not shutting down properly (orphaned processes), use these commands:

**Cross-platform shutdown (recommended):**
```bash
npm run stop
```

**Shell script shutdown (Unix/Linux/macOS only):**
```bash
npm run stop:shell
```

**Force shutdown (when processes are stuck):**
```bash
npm run stop:force
```

**Manual troubleshooting:**
```bash
# Check which processes are using the ports
lsof -ti:3000 -ti:3001 -ti:5173

# Kill specific processes by PID
kill -TERM <PID>

# Force kill if needed
kill -KILL <PID>
```

### Port Status Check

Check if ports are free before starting:
```bash
# Check individual ports
lsof -ti:3000  # MCP HTTP Server
lsof -ti:3001  # WebSocket Server  
lsof -ti:5173  # Vue.js Dev Server

# No output means the port is free
```

### Logs

- Server logs appear in terminal console
- Browser logs available in developer tools
- Connection activity visible in web interface sidebar

## License

MIT License - see LICENSE file for details. 
