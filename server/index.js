import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { McpServer } from './mcpServer.js';
import { setupWebSocketServer } from './webSocketServer.js';

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize MCP server
const mcpServer = new McpServer();

// Create WebSocket server for browser communication
const wsServer = new WebSocketServer({ port: WS_PORT });
const webSocketHandler = setupWebSocketServer(wsServer);

// Connect MCP server to WebSocket handler for content broadcasting
mcpServer.setWebSocketHandler(webSocketHandler);

// Start MCP server with HTTP transport
mcpServer.start(app);

// Start HTTP server
server.listen(PORT, () => {
  console.log(`MCP Display Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`MCP endpoints available at http://localhost:${PORT}/mcp`);
});

// Graceful shutdown
let shutdownInProgress = false;

const gracefulShutdown = (signal) => {
  if (shutdownInProgress) {
    console.log('\nForce shutdown initiated...');
    process.exit(1);
  }
  
  shutdownInProgress = true;
  console.log(`\nReceived ${signal}. Shutting down servers gracefully...`);
  
  // Set a timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    console.log('Force shutdown due to timeout');
    process.exit(1);
  }, 10000); // 10 seconds timeout
  
  // Close servers in sequence
  server.close((err) => {
    if (err) {
      console.error('Error closing HTTP server:', err);
    } else {
      console.log('HTTP server closed');
    }
    
    wsServer.close((err) => {
      if (err) {
        console.error('Error closing WebSocket server:', err);
      } else {
        console.log('WebSocket server closed');
      }
      
      clearTimeout(forceShutdownTimeout);
      console.log('Servers shut down successfully');
      process.exit(0);
    });
  });
  
  // Close all existing connections
  server.closeAllConnections?.();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
}); 