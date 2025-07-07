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

  describe('server initialization', () => {
    test('should initialize with correct server info', () => {
      expect(mcpServer.server).toBeDefined();
      expect(mcpServer.webSocketHandler).toBe(mockWebSocketHandler);
    });
  });
}); 