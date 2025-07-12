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

  /**
   * Handle initialize request
   */
  async handleInitialize(params) {
    console.log('MCP client initializing with params:', params);
    
    // Store client info for use in initialized notification
    this.lastClientInfo = params?.clientInfo;
    
    if (this.webSocketHandler) {
      // Extract client information for display
      const clientInfo = params?.clientInfo;
      let logMessage = 'MCP client initialization started';
      
      if (clientInfo) {
        const clientName = clientInfo.name || 'unknown';
        const clientVersion = clientInfo.version || 'unknown';
        logMessage = `MCP client connected: ${clientName} v${clientVersion}`;
      }
      
      this.webSocketHandler.sendLog(logMessage);
    }

    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'mcp-display-server',
        version: '1.0.0',
      },
    };
  }

  /**
   * Handle initialized notification (both "initialized" and "notifications/initialized")
   */
  async handleInitialized() {
    console.log('MCP client sent initialized notification');
    
    if (this.webSocketHandler) {
      // Use stored client info if available
      let logMessage = 'MCP client fully initialized';
      
      if (this.lastClientInfo) {
        const clientName = this.lastClientInfo.name || 'unknown';
        const clientVersion = this.lastClientInfo.version || 'unknown';
        logMessage = `MCP client ready: ${clientName} v${clientVersion}`;
      }
      
      this.webSocketHandler.sendLog(logMessage);
    }
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
              caption: {
                type: 'string',
                description: 'Optional caption to display underneath the image',
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
              caption: {
                type: 'string',
                description: 'Optional caption to display underneath the SVG',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'display_image_url',
          description: 'Display an image from a URL in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the image to display (supports common image formats: JPEG, PNG, GIF, WebP)',
              },
              caption: {
                type: 'string',
                description: 'Optional caption to display underneath the image',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'open_url',
          description: 'Open a URL in a new browser tab',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to open in a new tab (must use HTTP or HTTPS protocol)',
              },
            },
            required: ['url'],
          },
        },
      ],
    };
  }

  async handleToolCall(params) {
    const { name, arguments: args } = params;

    // Check for unknown tool names first (before try-catch to avoid stack traces)
    const validTools = ['display_text', 'display_image', 'display_svg', 'display_image_url', 'open_url'];
    if (!validTools.includes(name)) {
      console.log(`Unknown tool requested: "${name}". Available tools: ${validTools.join(', ')}`);
      
      if (this.webSocketHandler) {
        this.webSocketHandler.sendLog(`Unknown tool requested: "${name}"`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: "${name}". Available tools are: ${validTools.join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    try {
      switch (name) {
        case 'display_text':
          return await this.handleTextDisplay(args);
        case 'display_image':
          return await this.handleImageDisplay(args);
        case 'display_svg':
          return await this.handleSvgDisplay(args);
        case 'display_image_url':
          return await this.handleImageUrlDisplay(args);
        case 'open_url':
          return await this.handleOpenUrl(args);
      }
    } catch (error) {
      // Log actual errors (validation, processing, etc.) with more detail for debugging
      console.error(`Error handling tool "${name}":`, error.message);
      
      if (this.webSocketHandler) {
        this.webSocketHandler.sendLog(`Error in tool "${name}": ${error.message}`);
      }
      
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
    const { content, caption } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Validate base64 image format
    if (!content.startsWith('data:image/')) {
      throw new Error('Content must be a base64-encoded image with data URI prefix (e.g., data:image/png;base64,...)');
    }

    // Send content to browser via WebSocket
    if (this.webSocketHandler) {
      this.webSocketHandler.sendContent('image', content, caption);
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
    const { content, caption } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Basic SVG validation
    if (!content.trim().toLowerCase().includes('<svg')) {
      throw new Error('Content must contain valid SVG markup');
    }

    // Send content to browser via WebSocket
    if (this.webSocketHandler) {
      this.webSocketHandler.sendContent('svg', content, caption);
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

  async handleImageUrlDisplay(args) {
    const { url, caption } = args;
    
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow http and https protocols for security
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }

    // Fetch the image from the URL
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      // Check if the response is an image
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL does not point to an image resource');
      }

      // Convert to buffer and then to base64
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const dataUri = `data:${contentType};base64,${base64Data}`;

      // Send content to browser via WebSocket
      if (this.webSocketHandler) {
        this.webSocketHandler.sendContent('image-url', dataUri, caption);
        this.webSocketHandler.sendLog(`Image from URL displayed: ${url}`);
      }

      console.log(`Displayed image from URL: ${url}`);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully displayed image from URL: ${url}`,
          },
        ],
      };
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error(`Failed to fetch image from URL: ${error.message}`);
      }
      throw error;
    }
  }

  async handleOpenUrl(args) {
    const { url } = args;
    
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow http and https protocols for security
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }

    // Send URL to browser via WebSocket (both open and display)
    if (this.webSocketHandler) {
      this.webSocketHandler.sendOpenUrl(url);
      this.webSocketHandler.sendContent('url', url);
      this.webSocketHandler.sendLog(`Opening URL in new tab: ${url}`);
    }

    console.log(`Opening URL in new tab: ${url}`);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully opened URL in new tab: ${url}`,
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
        
        // Check for unknown methods first (before try-catch to avoid stack traces)
        const validMethods = ['initialize', 'initialized', 'notifications/initialized', 'tools/list', 'tools/call'];
        if (!validMethods.includes(request.method)) {
          console.log(`Unknown MCP method requested: "${request.method}". Available methods: ${validMethods.join(', ')}`);
          
          if (this.webSocketHandler) {
            this.webSocketHandler.sendLog(`Unknown MCP method: "${request.method}"`);
          }
          
          return res.json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Unknown method: "${request.method}". Available methods: ${validMethods.join(', ')}`
            }
          });
        }

        // Route to appropriate handler based on method
        try {
          switch (request.method) {
            case 'initialize':
              response = await this.handleInitialize(request.params);
              break;
              
            case 'initialized':
            case 'notifications/initialized':
              // This is a notification - handle it but check if response is expected
              await this.handleInitialized();
              
              // Some MCP implementations expect a response even for notifications
              if (request.id !== undefined && request.id !== null) {
                return res.json({
                  jsonrpc: '2.0',
                  id: request.id,
                  result: null
                });
              } else {
                // True notification - no response
                return res.status(204).send();
              }
              
            case 'tools/list':
              response = await this.handleListTools();
              break;
              
            case 'tools/call':
              response = await this.handleToolCall(request.params);
              break;
          }
          
          res.json({
            jsonrpc: '2.0',
            id: request.id,
            result: response
          });
          
        } catch (error) {
          // Log actual processing errors (not unknown methods)
          console.error(`MCP method error (${request.method}):`, error.message);
          
          if (this.webSocketHandler) {
            this.webSocketHandler.sendLog(`Error in method "${request.method}": ${error.message}`);
          }
          
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
            display_image_url: 'Display images from URLs',
            open_url: 'Open URLs in new browser tabs and display clickable links',
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