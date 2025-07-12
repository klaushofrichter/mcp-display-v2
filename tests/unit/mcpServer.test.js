import { describe, test, beforeEach, expect } from '@jest/globals';
import { McpServer } from '../../server/mcpServer.js';

describe('McpServer', () => {
  let mcpServer;
  let mockWebSocketHandler;

  beforeEach(() => {
    mockWebSocketHandler = {
      sendContent: jest.fn(),
      sendLog: jest.fn(),
      sendOpenUrl: jest.fn(),
      broadcast: jest.fn(),
      getClientCount: jest.fn().mockReturnValue(1)
    };

    mcpServer = new McpServer();
    mcpServer.setWebSocketHandler(mockWebSocketHandler);
  });

  describe('handleTextDisplay', () => {
    test('should successfully display text content', async () => {
      const args = { content: 'Hello, World!' };
      
      const result = await mcpServer.handleTextDisplay(args);
      
      expect(result.content[0].text).toContain('Successfully displayed text content (13 characters)');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('text', 'Hello, World!');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Text content displayed (13 characters)');
    });

    test('should throw error for empty content', async () => {
      const args = { content: '' };
      
      await expect(mcpServer.handleTextDisplay(args))
        .rejects.toThrow('Content must be a non-empty string');
    });

    test('should throw error for non-string content', async () => {
      const args = { content: 123 };
      
      await expect(mcpServer.handleTextDisplay(args))
        .rejects.toThrow('Content must be a non-empty string');
    });

    test('should throw error for missing content', async () => {
      const args = {};
      
      await expect(mcpServer.handleTextDisplay(args))
        .rejects.toThrow('Content must be a non-empty string');
    });
  });

  describe('handleImageDisplay', () => {
    test('should successfully display image content', async () => {
      const args = { content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };
      
      const result = await mcpServer.handleImageDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed image content');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('image', args.content, undefined);
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Image content displayed');
    });

    test('should throw error for invalid image format', async () => {
      const args = { content: 'invalid-base64-image' };
      
      await expect(mcpServer.handleImageDisplay(args))
        .rejects.toThrow('Content must be a base64-encoded image with data URI prefix');
    });

    test('should throw error for empty content', async () => {
      const args = { content: '' };
      
      await expect(mcpServer.handleImageDisplay(args))
        .rejects.toThrow('Content must be a non-empty string');
    });

    test('should successfully display image content with caption', async () => {
      const args = { 
        content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        caption: 'Test image caption'
      };
      
      const result = await mcpServer.handleImageDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed image content');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('image', args.content, 'Test image caption');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Image content displayed');
    });
  });

  describe('handleSvgDisplay', () => {
    test('should successfully display SVG content', async () => {
      const args = { content: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>' };
      
      const result = await mcpServer.handleSvgDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed SVG content');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('svg', args.content, undefined);
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('SVG content displayed');
    });

    test('should throw error for invalid SVG content', async () => {
      const args = { content: 'not-an-svg' };
      
      await expect(mcpServer.handleSvgDisplay(args))
        .rejects.toThrow('Content must contain valid SVG markup');
    });

    test('should throw error for empty content', async () => {
      const args = { content: '' };
      
      await expect(mcpServer.handleSvgDisplay(args))
        .rejects.toThrow('Content must be a non-empty string');
    });

    test('should work with case variations', async () => {
      const args = { content: '<SVG width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></SVG>' };
      
      const result = await mcpServer.handleSvgDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed SVG content');
    });

    test('should successfully display SVG content with caption', async () => {
      const args = { 
        content: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>',
        caption: 'Test SVG caption'
      };
      
      const result = await mcpServer.handleSvgDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed SVG content');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('svg', args.content, 'Test SVG caption');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('SVG content displayed');
    });
  });

  describe('handleImageUrlDisplay', () => {
    // Mock fetch for testing
    global.fetch = jest.fn();

    beforeEach(() => {
      fetch.mockClear();
    });

    test('should successfully display image from URL', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('image/png')
        },
        arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer.buffer)
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const args = { url: 'https://example.com/image.png' };
      const result = await mcpServer.handleImageUrlDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed image from URL: https://example.com/image.png');
      expect(fetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('image-url', expect.stringContaining('data:image/png;base64,'), undefined);
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Image from URL displayed: https://example.com/image.png');
    });

    test('should throw error for invalid URL', async () => {
      const args = { url: 'invalid-url' };
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('Invalid URL format');
    });

    test('should throw error for non-HTTP protocols', async () => {
      const args = { url: 'ftp://example.com/image.png' };
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('URL must use HTTP or HTTPS protocol');
    });

    test('should throw error for fetch failure', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const args = { url: 'https://example.com/nonexistent.png' };
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('Failed to fetch image: 404 Not Found');
    });

    test('should throw error for non-image content', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const args = { url: 'https://example.com/page.html' };
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('URL does not point to an image resource');
    });

    test('should throw error for empty URL', async () => {
      const args = { url: '' };
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('URL must be a non-empty string');
    });

    test('should throw error for missing URL', async () => {
      const args = {};
      
      await expect(mcpServer.handleImageUrlDisplay(args))
        .rejects.toThrow('URL must be a non-empty string');
    });

    test('should successfully display image from URL with caption', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('image/png')
        },
        arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer.buffer)
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const args = { 
        url: 'https://example.com/image.png',
        caption: 'Test URL image caption'
      };
      const result = await mcpServer.handleImageUrlDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed image from URL: https://example.com/image.png');
      expect(fetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('image-url', expect.stringContaining('data:image/png;base64,'), 'Test URL image caption');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Image from URL displayed: https://example.com/image.png');
    });
  });

  describe('handleOpenUrl', () => {
    test('should successfully open a valid URL and display content', async () => {
      const args = { url: 'https://example.com' };
      
      const result = await mcpServer.handleOpenUrl(args);
      
      expect(result.content[0].text).toBe('Successfully opened URL in new tab: https://example.com');
      expect(mockWebSocketHandler.sendOpenUrl).toHaveBeenCalledWith('https://example.com');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('url', 'https://example.com');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Opening URL in new tab: https://example.com');
    });

    test('should successfully open HTTP URL and display content', async () => {
      const args = { url: 'http://example.com' };
      
      const result = await mcpServer.handleOpenUrl(args);
      
      expect(result.content[0].text).toBe('Successfully opened URL in new tab: http://example.com');
      expect(mockWebSocketHandler.sendOpenUrl).toHaveBeenCalledWith('http://example.com');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('url', 'http://example.com');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Opening URL in new tab: http://example.com');
    });

    test('should throw error for invalid URL', async () => {
      const args = { url: 'not-a-valid-url' };
      
      await expect(mcpServer.handleOpenUrl(args))
        .rejects.toThrow('Invalid URL format');
    });

    test('should throw error for non-HTTP/HTTPS protocols', async () => {
      const args = { url: 'ftp://example.com' };
      
      await expect(mcpServer.handleOpenUrl(args))
        .rejects.toThrow('URL must use HTTP or HTTPS protocol');
    });

    test('should throw error for empty URL', async () => {
      const args = { url: '' };
      
      await expect(mcpServer.handleOpenUrl(args))
        .rejects.toThrow('URL must be a non-empty string');
    });

    test('should throw error for missing URL', async () => {
      const args = {};
      
      await expect(mcpServer.handleOpenUrl(args))
        .rejects.toThrow('URL must be a non-empty string');
    });

    test('should throw error for non-string URL', async () => {
      const args = { url: 123 };
      
      await expect(mcpServer.handleOpenUrl(args))
        .rejects.toThrow('URL must be a non-empty string');
    });
  });

  describe('setWebSocketHandler', () => {
    test('should set WebSocket handler correctly', () => {
      const newHandler = { test: true };
      mcpServer.setWebSocketHandler(newHandler);
      
      expect(mcpServer.webSocketHandler).toBe(newHandler);
    });
  });

  describe('handleToolCall', () => {
    test('should successfully call valid tools', async () => {
      const params = {
        name: 'display_text',
        arguments: { content: 'Test content' }
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.content[0].text).toContain('Successfully displayed text content');
      expect(result.isError).toBeUndefined();
    });

    test('should successfully call open_url tool', async () => {
      const params = {
        name: 'open_url',
        arguments: { url: 'https://example.com' }
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.content[0].text).toContain('Successfully opened URL in new tab');
      expect(result.isError).toBeUndefined();
    });

    test('should gracefully handle unknown tool names', async () => {
      const params = {
        name: 'invalid_tool',
        arguments: { content: 'test' }
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool: "invalid_tool"');
      expect(result.content[0].text).toContain('Available tools are: display_text, display_image, display_svg, display_image_url, open_url');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Unknown tool requested: "invalid_tool"');
    });

    test('should handle tool execution errors gracefully', async () => {
      const params = {
        name: 'display_text',
        arguments: { content: null } // This will cause a validation error
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Content must be a non-empty string');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Error in tool "display_text": Content must be a non-empty string');
    });

    test('should not expose stack traces for unknown tools', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const params = {
        name: 'nonexistent_tool',
        arguments: { content: 'test' }
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.isError).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown tool requested: "nonexistent_tool". Available tools: display_text, display_image, display_svg, display_image_url, open_url');
      
      // Ensure no error was logged (no stack trace)
      expect(jest.spyOn(console, 'error')).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('handleInitialize', () => {
    test('should return proper initialization response with client info', async () => {
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: 'test-client', version: '1.0.0' }
      };
      
      const result = await mcpServer.handleInitialize(params);
      
      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.capabilities.tools).toBeDefined();
      expect(result.serverInfo.name).toBe('mcp-display-server');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client connected: test-client v1.0.0');
      
      // Verify client info is stored for later use
      expect(mcpServer.lastClientInfo).toEqual({ name: 'test-client', version: '1.0.0' });
    });

    test('should handle missing client info gracefully', async () => {
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: true } }
        // No clientInfo provided
      };
      
      const result = await mcpServer.handleInitialize(params);
      
      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.capabilities.tools).toBeDefined();
      expect(result.serverInfo.name).toBe('mcp-display-server');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client initialization started');
      
      // Verify no client info is stored
      expect(mcpServer.lastClientInfo).toBeUndefined();
    });

    test('should handle incomplete client info gracefully', async () => {
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: 'claude-code' } // No version provided
      };
      
      const result = await mcpServer.handleInitialize(params);
      
      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.capabilities.tools).toBeDefined();
      expect(result.serverInfo.name).toBe('mcp-display-server');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client connected: claude-code vunknown');
      
      // Verify incomplete client info is stored
      expect(mcpServer.lastClientInfo).toEqual({ name: 'claude-code' });
    });

    test('should handle empty client info gracefully', async () => {
      const params = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: { listChanged: true } },
        clientInfo: {} // Empty clientInfo
      };
      
      const result = await mcpServer.handleInitialize(params);
      
      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.capabilities.tools).toBeDefined();
      expect(result.serverInfo.name).toBe('mcp-display-server');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client connected: unknown vunknown');
      
      // Verify empty client info is stored
      expect(mcpServer.lastClientInfo).toEqual({});
    });
  });

  describe('handleInitialized', () => {
    test('should handle initialized notification with stored client info', async () => {
      // First initialize with client info
      const initParams = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: {} },
        clientInfo: { name: 'claude-code', version: '1.0.44' }
      };
      await mcpServer.handleInitialize(initParams);
      
      // Clear previous call logs
      mockWebSocketHandler.sendLog.mockClear();
      
      // Then call initialized
      await mcpServer.handleInitialized();
      
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client ready: claude-code v1.0.44');
    });

    test('should handle initialized notification without stored client info', async () => {
      // Call initialized without prior initialization (or with no client info)
      await mcpServer.handleInitialized();
      
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client fully initialized');
    });

    test('should handle initialized notification with incomplete stored client info', async () => {
      // First initialize with incomplete client info
      const initParams = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: {} },
        clientInfo: { name: 'test-client' } // No version
      };
      await mcpServer.handleInitialize(initParams);
      
      // Clear previous call logs
      mockWebSocketHandler.sendLog.mockClear();
      
      // Then call initialized
      await mcpServer.handleInitialized();
      
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client ready: test-client vunknown');
    });

    test('should handle initialized notification with empty stored client info', async () => {
      // First initialize with empty client info
      const initParams = {
        protocolVersion: '2024-11-05',
        capabilities: { roots: {} },
        clientInfo: {} // Empty
      };
      await mcpServer.handleInitialize(initParams);
      
      // Clear previous call logs
      mockWebSocketHandler.sendLog.mockClear();
      
      // Then call initialized
      await mcpServer.handleInitialized();
      
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client ready: unknown vunknown');
    });

    test('should work without WebSocket handler', async () => {
      // Create server without WebSocket handler
      const serverWithoutWS = new McpServer();
      
      // Should not throw error
      await expect(serverWithoutWS.handleInitialized()).resolves.toBeUndefined();
    });

    test('should log correctly for both notification formats', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await mcpServer.handleInitialized();
      
      expect(consoleSpy).toHaveBeenCalledWith('MCP client sent initialized notification');
      
      consoleSpy.mockRestore();
    });
  });

  describe('handleListTools', () => {
    test('should return all available tools', async () => {
      const result = await mcpServer.handleListTools();
      
      expect(result.tools).toHaveLength(5);
      expect(result.tools.map(t => t.name)).toEqual(['display_text', 'display_image', 'display_svg', 'display_image_url', 'open_url']);
      
      // Verify tool schemas
      result.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.required).toBeDefined();
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
        
        // Verify the correct property exists for each tool
        if (tool.name === 'display_image_url' || tool.name === 'open_url') {
          expect(tool.inputSchema.properties.url).toBeDefined();
          expect(tool.inputSchema.required).toContain('url');
        } else {
          expect(tool.inputSchema.properties.content).toBeDefined();
          expect(tool.inputSchema.required).toContain('content');
        }
      });
    });
  });

  describe('server initialization', () => {
    test('should initialize with correct server info', () => {
      expect(mcpServer.server).toBeDefined();
      expect(mcpServer.webSocketHandler).toBe(mockWebSocketHandler);
    });
  });
}); 