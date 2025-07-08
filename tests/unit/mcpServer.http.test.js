import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { McpServer } from '../../server/mcpServer.js';

describe('McpServer HTTP API Error Handling', () => {
  let app;
  let mcpServer;
  let mockWebSocketHandler;
  let server;

  beforeEach(async () => {
    // Create Express app
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Mock WebSocket handler
    mockWebSocketHandler = {
      sendContent: jest.fn(),
      sendLog: jest.fn(),
      broadcast: jest.fn(),
      getClientCount: jest.fn().mockReturnValue(1)
    };

    // Create and start MCP server
    mcpServer = new McpServer();
    mcpServer.setWebSocketHandler(mockWebSocketHandler);
    await mcpServer.start(app);

    // Start server on a test port
    server = app.listen(0); // Use port 0 for dynamic port assignment
  });

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('POST /mcp - Unknown Methods', () => {
    test('should return proper JSON-RPC error for unknown method', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'unknown_method',
          params: {}
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
          data: 'Unknown method: "unknown_method". Available methods: initialize, initialized, tools/list, tools/call'
        }
      });
    });

    test('should log unknown method without stack trace', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'invalid_method',
          params: {}
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown MCP method requested: "invalid_method". Available methods: initialize, initialized, tools/list, tools/call'
      );
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Unknown MCP method: "invalid_method"');

      consoleSpy.mockRestore();
    });

    test('should handle multiple unknown methods consistently', async () => {
      const unknownMethods = ['foo', 'bar', 'baz/test', 'tools/unknown'];

      for (const method of unknownMethods) {
        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 1,
            method,
            params: {}
          });

        expect(response.status).toBe(200);
        expect(response.body.error.code).toBe(-32601);
        expect(response.body.error.message).toBe('Method not found');
        expect(response.body.error.data).toContain(`Unknown method: "${method}"`);
      }
    });
  });

  describe('POST /mcp - Unknown Tools', () => {
    test('should return error result for unknown tool', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'unknown_tool',
            arguments: { content: 'test' }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            {
              type: 'text',
              text: 'Unknown tool: "unknown_tool". Available tools are: display_text, display_image, display_svg'
            }
          ],
          isError: true
        }
      });
    });

    test('should log unknown tool without stack trace', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'invalid_tool',
            arguments: { content: 'test' }
          }
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown tool requested: "invalid_tool". Available tools: display_text, display_image, display_svg'
      );
      expect(mockWebSocketHandler.sendLog).toHaveBeenCalledWith('Unknown tool requested: "invalid_tool"');

      consoleSpy.mockRestore();
    });
  });

  describe('POST /mcp - Valid Requests', () => {
    test('should handle initialize method correctly', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { roots: { listChanged: true } },
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.id).toBe(1);
      expect(response.body.result.protocolVersion).toBe('2024-11-05');
      expect(response.body.result.serverInfo.name).toBe('mcp-display-server');
    });

    test('should handle tools/list method correctly', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        });

      expect(response.status).toBe(200);
      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.id).toBe(1);
      expect(response.body.result.tools).toHaveLength(3);
      expect(response.body.result.tools.map(t => t.name)).toEqual([
        'display_text', 'display_image', 'display_svg'
      ]);
    });

    test('should handle valid tool calls correctly', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'display_text',
            arguments: { content: 'Test content' }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.id).toBe(1);
      expect(response.body.result.content[0].text).toContain('Successfully displayed text content');
      expect(response.body.result.isError).toBeUndefined();
    });
  });

  describe('POST /mcp - Malformed Requests', () => {
    test('should handle missing jsonrpc field', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          id: 1,
          method: 'tools/list',
          params: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(-32600);
      expect(response.body.error.message).toBe('Invalid Request');
    });

    test('should handle missing method field', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          params: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(-32600);
      expect(response.body.error.message).toBe('Invalid Request');
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(-32600);
      expect(response.body.error.message).toBe('Invalid Request');
    });
  });
}); 