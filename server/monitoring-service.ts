import { EventEmitter } from 'events';
import { WebSocketService } from './websocket-service.js';

export interface AgentMetrics {
  agentId: string;
  status: 'idle' | 'processing' | 'error' | 'offline';
  lastActivity: Date;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  activeConnections: number;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalRequests: number;
  systemLoad: number;
  memoryUsage: number;
  uptime: number;
}

// Placeholder for Alert interface, assuming it's defined elsewhere
interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  agentId?: string;
  timestamp: Date;
}


class MonitoringService extends EventEmitter {
  private agentMetrics = new Map<string, AgentMetrics>();
  private wsService?: WebSocketService;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(wsService?: WebSocketService) {
    super();
    this.wsService = wsService;
    // Start monitoring only if wsService is provided, to avoid errors
    if (this.wsService) {
      this.startMonitoring();
    }
  }

  private startMonitoring() {
    // Update metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.broadcastMetrics();
    }, 30000);
  }

  updateAgentMetrics(agentId: string, metrics: Partial<AgentMetrics>) {
    const existing = this.agentMetrics.get(agentId) || {
      agentId,
      status: 'idle',
      lastActivity: new Date(),
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      activeConnections: 0,
    };

    const updated = { ...existing, ...metrics, lastActivity: new Date() };
    this.agentMetrics.set(agentId, updated);

    this.emit('agent-metrics-updated', updated);
  }

  getAgentMetrics(agentId: string): AgentMetrics | null {
    return this.agentMetrics.get(agentId) || null;
  }

  getAllAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agentMetrics.values());
  }

  getSystemMetrics(): SystemMetrics {
    const agents = Array.from(this.agentMetrics.values());
    const activeAgents = agents.filter(a => a.status !== 'offline').length;
    const totalRequests = agents.reduce((sum, a) => sum + a.requestsPerMinute, 0);

    return {
      totalAgents: agents.length,
      activeAgents,
      totalRequests,
      systemLoad: this.getSystemLoad(),
      memoryUsage: this.getMemoryUsage(),
      uptime: process.uptime(),
    };
  }

  private updateSystemMetrics() {
    // Mark agents as offline if no activity in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    for (const [agentId, metrics] of this.agentMetrics) {
      if (metrics.lastActivity < fiveMinutesAgo && metrics.status !== 'offline') {
        this.updateAgentMetrics(agentId, { status: 'offline' });
      }
    }
  }

  private broadcastMetrics() {
    const systemMetrics = this.getSystemMetrics();
    const agentMetrics = this.getAllAgentMetrics();

    // Broadcast only if wsService is available
    if (this.wsService) {
      this.wsService.broadcast('system-metrics', systemMetrics);
      this.wsService.broadcast('agent-metrics', agentMetrics);
    }
  }

  private getSystemLoad(): number {
    // Simplified system load calculation
    const agents = Array.from(this.agentMetrics.values());
    const processingAgents = agents.filter(a => a.status === 'processing').length;
    return processingAgents / Math.max(agents.length, 1);
  }

  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    return (used.heapUsed / used.heapTotal) * 100;
  }

  createAlert(severity: 'low' | 'medium' | 'high', message: string, agentId?: string) {
    const alert = {
      id: `alert-${Date.now()}`,
      severity,
      message,
      agentId,
      timestamp: new Date(),
    };

    this.emit('alert-created', alert);
    // Broadcast only if wsService is available
    if (this.wsService) {
      this.wsService.broadcast('alert', alert);
    }

    return alert;
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

export const monitoringService = new MonitoringService();