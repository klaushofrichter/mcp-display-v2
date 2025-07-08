import { describe, test, beforeEach, expect } from '@jest/globals';
import { McpServer } from '../../server/mcpServer.js';

describe('McpServer', () => {
  let mcpServer;
  let mockWebSocketHandler;

  beforeEach(() => {
    mockWebSocketHandler = {
      sendContent: jest.fn(),
      sendLog: jest.fn(),
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
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('image', args.content);
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
  });

  describe('handleSvgDisplay', () => {
    test('should successfully display SVG content', async () => {
      const args = { content: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>' };
      
      const result = await mcpServer.handleSvgDisplay(args);
      
      expect(result.content[0].text).toBe('Successfully displayed SVG content');
      expect(mockWebSocketHandler.sendContent).toHaveBeenCalledWith('svg', args.content);
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

    test('should gracefully handle unknown tool names', async () => {
      const params = {
        name: 'invalid_tool',
        arguments: { content: 'test' }
      };
      
      const result = await mcpServer.handleToolCall(params);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool: "invalid_tool"');
      expect(result.content[0].text).toContain('Available tools are: display_text, display_image, display_svg');
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
      expect(consoleSpy).toHaveBeenCalledWith('Unknown tool requested: "nonexistent_tool". Available tools: display_text, display_image, display_svg');
      
      // Ensure no error was logged (no stack trace)
      expect(jest.spyOn(console, 'error')).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('handleInitialize', () => {
    test('should return proper initialization response', async () => {
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
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('MCP client initialization started');
    });
  });

  describe('handleListTools', () => {
    test('should return all available tools', async () => {
      const result = await mcpServer.handleListTools();
      
      expect(result.tools).toHaveLength(3);
      expect(result.tools.map(t => t.name)).toEqual(['display_text', 'display_image', 'display_svg']);
      
      // Verify tool schemas
      result.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties.content).toBeDefined();
        expect(tool.inputSchema.required).toContain('content');
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