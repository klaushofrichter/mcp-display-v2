/**
 * WebSocket server for browser communication
 * Handles real-time updates to the Vue.js frontend
 */

export function setupWebSocketServer(wsServer) {
  const clients = new Set();

  wsServer.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    clients.add(ws);
    
    console.log(`Browser client connected: ${clientId} (${clients.size} total)`);

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'log',
      message: `Browser connected as ${clientId}`
    }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Browser client disconnected: ${clientId} (${clients.size} remaining)`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(ws);
    });

    // Handle ping/pong for connection health
    ws.on('ping', () => {
      ws.pong();
    });
  });

  // Return handler object for broadcasting content
  return {
    broadcast: (data) => {
      const message = JSON.stringify(data);
      let sent = 0;
      let failed = 0;

      clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          try {
            client.send(message);
            sent++;
          } catch (error) {
            console.error('Error sending message to client:', error);
            clients.delete(client);
            failed++;
          }
        } else {
          clients.delete(client);
          failed++;
        }
      });

      if (sent > 0) {
        console.log(`Broadcasted message to ${sent} client(s)`);
      }
      if (failed > 0) {
        console.log(`Failed to send to ${failed} client(s)`);
      }
    },

    sendLog: function(message) {
      this.broadcast({
        type: 'log',
        message,
        timestamp: Date.now()
      });
    },

    sendContent: function(contentType, content, caption = null) {
      this.broadcast({
        type: 'content',
        contentType,
        content,
        caption,
        timestamp: Date.now()
      });
    },

    sendOpenUrl: function(url) {
      this.broadcast({
        type: 'openUrl',
        url,
        timestamp: Date.now()
      });
    },

    getClientCount: () => clients.size
  };
} 