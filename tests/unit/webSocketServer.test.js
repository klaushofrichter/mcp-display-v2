import { describe, test, beforeEach, expect } from '@jest/globals';
import { setupWebSocketServer } from '../../server/webSocketServer.js';
import { EventEmitter } from 'events';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // WebSocket.OPEN
  }

  send(data) {
    this.lastSentData = data;
  }

  pong() {
    this.emit('pong');
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }
}

// Mock WebSocketServer
class MockWebSocketServer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  addClient() {
    const client = new MockWebSocket();
    this.clients.add(client);
    this.emit('connection', client, {});
    return client;
  }
}

describe('WebSocket Server', () => {
  let mockWsServer;
  let handler;

  beforeEach(() => {
    mockWsServer = new MockWebSocketServer();
    handler = setupWebSocketServer(mockWsServer);
  });

  describe('client connection', () => {
    test('should handle client connection correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const client = mockWsServer.addClient();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Browser client connected'));
      expect(client.lastSentData).toBeDefined();
      
      const sentData = JSON.parse(client.lastSentData);
      expect(sentData.type).toBe('log');
      expect(sentData.message).toContain('Browser connected as');
      
      consoleSpy.mockRestore();
    });

    test('should handle client disconnection correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const client = mockWsServer.addClient();
      client.close();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Browser client disconnected'));
      
      consoleSpy.mockRestore();
    });

    test('should handle ping/pong correctly', () => {
      const client = mockWsServer.addClient();
      const pongSpy = jest.spyOn(client, 'pong');
      
      client.emit('ping');
      
      expect(pongSpy).toHaveBeenCalled();
      
      pongSpy.mockRestore();
    });
  });

  describe('broadcast functionality', () => {
    test('should broadcast message to all connected clients', () => {
      const client1 = mockWsServer.addClient();
      const client2 = mockWsServer.addClient();
      
      const testData = { type: 'test', message: 'Hello World' };
      
      handler.broadcast(testData);
      
      expect(client1.lastSentData).toBe(JSON.stringify(testData));
      expect(client2.lastSentData).toBe(JSON.stringify(testData));
    });

    test('should handle disconnected clients during broadcast', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const client1 = mockWsServer.addClient();
      const client2 = mockWsServer.addClient();
      
      // Simulate client2 being disconnected
      client2.readyState = 3; // WebSocket.CLOSED
      
      const testData = { type: 'test', message: 'Hello World' };
      
      handler.broadcast(testData);
      
      expect(client1.lastSentData).toBe(JSON.stringify(testData));
      expect(consoleSpy).toHaveBeenCalledWith('Broadcasted message to 1 client(s)');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to send to 1 client(s)');
      
      consoleSpy.mockRestore();
    });

    test('should handle send errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const client = mockWsServer.addClient();
      
      // Mock send to throw an error
      client.send = jest.fn(() => {
        throw new Error('Send failed');
      });
      
      const testData = { type: 'test', message: 'Hello World' };
      
      handler.broadcast(testData);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to client:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Failed to send to 1 client(s)');
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('helper methods', () => {
    test('should return correct client count', () => {
      expect(handler.getClientCount()).toBe(0);
      
      mockWsServer.addClient();
      expect(handler.getClientCount()).toBe(1);
      
      mockWsServer.addClient();
      expect(handler.getClientCount()).toBe(2);
    });

    test('should send log messages correctly', () => {
      const client = mockWsServer.addClient();
      
      handler.sendLog('Test log message');
      
      const sentData = JSON.parse(client.lastSentData);
      expect(sentData.type).toBe('log');
      expect(sentData.message).toBe('Test log message');
      expect(sentData.timestamp).toBeDefined();
    });

    test('should send content correctly', () => {
      const client = mockWsServer.addClient();
      
      handler.sendContent('text', 'Hello World');
      
      const sentData = JSON.parse(client.lastSentData);
      expect(sentData.type).toBe('content');
      expect(sentData.contentType).toBe('text');
      expect(sentData.content).toBe('Hello World');
      expect(sentData.timestamp).toBeDefined();
    });
  });
}); 