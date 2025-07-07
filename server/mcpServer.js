import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Server implementation for display functionality
 * Provides tools for text, image, and SVG display
 */
export class McpServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-display-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.webSocketHandler = null;
    this.setupRequestHandlers();
  }

  setWebSocketHandler(handler) {
    this.webSocketHandler = handler;
  }

  setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return this.handleListTools();
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params);
    });
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: 'display_text',
          description: 'Display ASCII text content in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The text content to display',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'display_image',
          description: 'Display a base64-encoded image in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Base64-encoded image data (with data URI prefix like data:image/png;base64,)',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'display_svg',
          description: 'Display an SVG image in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'SVG content as a string',
              },
            },
            required: ['content'],
          },
        },
      ],
    };
  }

  async handleToolCall(params) {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'display_text':
          return await this.handleTextDisplay(args);
        case 'display_image':
          return await this.handleImageDisplay(args);
        case 'display_svg':
          return await this.handleSvgDisplay(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleTextDisplay(args) {
    const { content } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Send content to browser via WebSocket
    if (this.webSocketHandler) {
      this.webSocketHandler.sendContent('text', content);
      this.webSocketHandler.sendLog(`Text content displayed (${content.length} characters)`);
    }

    console.log(`Displayed text content: ${content.length} characters`);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully displayed text content (${content.length} characters)`,
        },
      ],
    };
  }

  async handleImageDisplay(args) {
    const { content } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Validate base64 image format
    if (!content.startsWith('data:image/')) {
      throw new Error('Content must be a base64-encoded image with data URI prefix (e.g., data:image/png;base64,...)');
    }

    // Send content to browser via WebSocket
    if (this.webSocketHandler) {
      this.webSocketHandler.sendContent('image', content);
      this.webSocketHandler.sendLog('Image content displayed');
    }

    console.log('Displayed image content');

    return {
      content: [
        {
          type: 'text',
          text: 'Successfully displayed image content',
        },
      ],
    };
  }

  async handleSvgDisplay(args) {
    const { content } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Basic SVG validation
    if (!content.trim().toLowerCase().includes('<svg')) {
      throw new Error('Content must contain valid SVG markup');
    }

    // Send content to browser via WebSocket
    if (this.webSocketHandler) {
      this.webSocketHandler.sendContent('svg', content);
      this.webSocketHandler.sendLog('SVG content displayed');
    }

    console.log('Displayed SVG content');

    return {
      content: [
        {
          type: 'text',
          text: 'Successfully displayed SVG content',
        },
      ],
    };
  }

  /**
   * Start the MCP server with HTTP transport
   */
  async start(app) {
    // Add MCP HTTP endpoints
    app.post('/mcp', async (req, res) => {
      try {
        const request = req.body;
        
        // Basic JSON-RPC validation
        if (!request || !request.jsonrpc || !request.method) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id: request?.id || null,
            error: {
              code: -32600,
              message: 'Invalid Request'
            }
          });
        }

        let response;
        
        // Route to appropriate handler based on method
        try {
          switch (request.method) {
            case 'tools/list':
              response = await this.handleListTools();
              break;
              
            case 'tools/call':
              response = await this.handleToolCall(request.params);
              break;
              
            default:
              throw new Error(`Unknown method: ${request.method}`);
          }
          
          res.json({
            jsonrpc: '2.0',
            id: request.id,
            result: response
          });
          
        } catch (error) {
          console.error(`MCP method error (${request.method}):`, error);
          res.json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Internal error',
              data: error.message
            }
          });
        }
        
      } catch (error) {
        console.error('MCP request parsing error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error'
          }
        });
      }
    });

    // MCP server info endpoint
    app.get('/mcp/info', (req, res) => {
      res.json({
        name: 'mcp-display-server',
        version: '1.0.0',
        description: 'MCP server for displaying text, images, and SVG content',
        capabilities: {
          tools: {
            display_text: 'Display ASCII text content',
            display_image: 'Display base64-encoded images',
            display_svg: 'Display SVG content',
          },
        },
        endpoints: {
          mcp: '/mcp',
          info: '/mcp/info',
          health: '/health',
        },
      });
    });

    console.log('MCP server initialized with HTTP transport');
    
    if (this.webSocketHandler) {
      this.webSocketHandler.sendLog('MCP server started and ready for connections');
    }
  }
} 