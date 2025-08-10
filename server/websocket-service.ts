import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';

export interface WebSocketMessage {
  type: string;
  agentId?: string;
  data: any;
  timestamp: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientId = this.generateClientId();
    this.clients.set(clientId, ws);

    console.log(`Client ${clientId} connected`);

    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      data: { clientId },
      timestamp: Date.now()
    });
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    switch (message.type) {
      case 'subscribe_agent':
        // Handle agent subscription
        console.log(`Client ${clientId} subscribed to agent ${message.agentId}`);
        break;
      case 'agent_command':
        // Handle agent commands
        this.processAgentCommand(clientId, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async processAgentCommand(clientId: string, message: WebSocketMessage) {
    // Process agent commands and send real-time updates
    this.sendToClient(clientId, {
      type: 'agent_response',
      agentId: message.agentId,
      data: { status: 'processing', message: 'Agent is working...' },
      timestamp: Date.now()
    });
  }

  sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcast(message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  sendToAgentSubscribers(agentId: string, message: WebSocketMessage) {
    // In a real implementation, track which clients are subscribed to which agents
    this.broadcast(message);
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  broadcastToAgent(agentId: string, data: any): void {
    // Broadcast to all connections for this agent
    console.log(`Broadcasting to agent ${agentId}:`, data);
  }
}

// Export only the class, instances will be created as needed