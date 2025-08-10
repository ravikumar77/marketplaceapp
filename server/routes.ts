import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import express from "express";
import { db } from "./db.js";
import { providers, services, bookings, reviews, users, agents, workflows, agentExecutions, prompts, agentMemories, platformConnectors, workflowExecutions, usageAnalytics } from "@shared/schema";
import { eq, sql, and, desc, gte, lte } from "drizzle-orm";
import { agentService } from "./agent-service.js";
import { agentTemplateService } from "./agent-templates.js";
import { promptLibrary } from './prompt-library.js';
import { authService } from './auth-service.js';
import { billingService } from './billing-service.js';
import { VectorService } from './vector-service.js';
import { memoryService } from './memory-service.js';
import { toolsService } from './tools-service.js';
import { slackConnector } from './connectors/slack-connector.js';
import { telegramConnector } from './connectors/telegram-connector.js';
import { googleSheetsConnector } from './connectors/google-sheets-connector.js';
import { monitoringService } from './monitoring-service.js';

const searchSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  service_id: z.string(),
});

const router = express.Router();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const vectorService = new VectorService();
  
  // Initialize database with seed data
  await storage.seedData();

  // Get all services
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Search providers by location and service
  app.post("/api/search", async (req, res) => {
    try {
      const { lat, lon, service_id } = searchSchema.parse(req.body);

      const providers = await storage.searchProviders(lat, lon, service_id);
      res.json(providers);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
        return;
      }
      console.error("Error searching providers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get provider profile
  app.get("/api/providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.getProviderWithServices(id);

      if (!provider) {
        res.status(404).json({ error: "Provider not found" });
        return;
      }

      // Get reviews
      const reviews = await storage.getProviderReviews(id, 5);

      res.json({ ...provider, reviews });
    } catch (error) {
      console.error("Error fetching provider:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      let bookingData = req.body;

      // If clientId is a username, convert to actual ID
      if (bookingData.clientId === "demo.client") {
        const client = await storage.getUserByUsername("demo.client");
        if (client) {
          bookingData.clientId = client.id;
        }
      }

      // Convert date strings to Date objects
      if (bookingData.scheduledStart) {
        bookingData.scheduledStart = new Date(bookingData.scheduledStart);
      }
      if (bookingData.scheduledEnd) {
        bookingData.scheduledEnd = new Date(bookingData.scheduledEnd);
      }

      const validatedBookingData = insertBookingSchema.parse(bookingData);
      const booking = await storage.createBooking(validatedBookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid booking data", details: error.errors });
        return;
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get booking
  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Agent Templates Route
  router.get("/api/agent-templates", async (req, res) => {
    try {
      const templates = agentTemplateService.getTemplates();
      res.json({ success: true, templates });
    } catch (error) {
      console.error("Error fetching agent templates:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // AI Agent Routes
  router.post("/api/agents", async (req, res) => {
    try {
      const { name, description, type, config } = req.body;
      const userId = req.body.userId; // In real app, get from auth session

      const agent = await agentService.createAgent(userId, {
        name,
        description,
        type,
        config
      });

      res.json({ success: true, agent });
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  router.get("/api/agents", async (req, res) => {
    try {
      const userId = req.query.userId as string; // In real app, get from auth session
      const userAgents = await agentService.getAgentsByUser(userId);
      res.json({ success: true, agents: userAgents });
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Updated agent execution route
  router.post("/api/agents/:id/execute", async (req, res) => {
    try {
      const agentId = req.params.id;
      const { input, workflowId } = req.body;

      const result = await agentService.executeAgent(agentId, input, workflowId);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error executing agent:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  router.post("/api/workflows", async (req, res) => {
    try {
      const { agentId, name, description, definition } = req.body;

      const workflow = await agentService.createWorkflow(agentId, {
        name,
        description,
        definition
      });

      res.json({ success: true, workflow });
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  router.get("/api/agents/:id/executions", async (req, res) => {
    try {
      const agentId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const executions = await agentService.getAgentExecutions(agentId, limit);
      res.json({ success: true, executions });
    } catch (error) {
      console.error("Error fetching executions:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Prompt Management Routes
  router.post("/api/prompts", async (req, res) => {
    try {
      const { userId, name, category, content } = req.body;

      const [prompt] = await db.insert(prompts).values({
        userId,
        name,
        category,
        content
      }).returning();

      res.json({ success: true, prompt });
    } catch (error) {
      console.error("Error creating prompt:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  router.get("/api/prompts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const category = req.query.category as string;

      let query = db.select().from(prompts).where(eq(prompts.userId, userId));

      if (category) {
        query = query.where(and(eq(prompts.userId, userId), eq(prompts.category, category)));
      }

      const userPrompts = await query;
      res.json({ success: true, prompts: userPrompts });
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // New routes added below

  // Agent Chat Route (assuming aiEngine is imported and configured elsewhere)
  app.post("/api/agents/:id/chat", async (req, res) => {
    try {
      const { id } = req.params;
      const { message, model } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Placeholder for AI engine call
      // const response = await aiEngine.processMessage(message, model);
      const response = { reply: `Echoing: ${message}`, source: 'aiEngine' }; // Mock response
      res.json(response);
    } catch (error) {
      console.error("Agent chat error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Memory Management
  app.get("/api/agents/:id/memories", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, limit = 10 } = req.query;

      const memories = await db
        .select()
        .from(agentMemories)
        .where(type ? 
          and(eq(agentMemories.agentId, id), eq(agentMemories.type, type as any)) :
          eq(agentMemories.agentId, id)
        )
        .orderBy(desc(agentMemories.timestamp))
        .limit(Number(limit));

      res.json(memories);
    } catch (error) {
      console.error("Get memories error:", error);
      res.status(500).json({ error: "Failed to get memories" });
    }
  });

  app.post("/api/agents/:id/memories", async (req, res) => {
    try {
      const { id } = req.params;
      const { content, type, metadata } = req.body;

      const memory = await db.insert(agentMemories).values({
        agentId: id,
        content,
        type,
        metadata,
      }).returning();

      res.json(memory[0]);
    } catch (error) {
      console.error("Store memory error:", error);
      res.status(500).json({ error: "Failed to store memory" });
    }
  });

  // Platform Connectors
  app.get("/api/agents/:id/connectors", async (req, res) => {
    try {
      const { id } = req.params;

      const connectors = await db
        .select()
        .from(platformConnectors)
        .where(eq(platformConnectors.agentId, id));

      res.json(connectors);
    } catch (error) {
      console.error("Get connectors error:", error);
      res.status(500).json({ error: "Failed to get connectors" });
    }
  });

  app.post("/api/agents/:id/connectors", async (req, res) => {
    try {
      const { id } = req.params;
      const { platform, config } = req.body;

      const connector = await db.insert(platformConnectors).values({
        agentId: id,
        platform,
        config,
        status: 'active',
      }).returning();

      res.json(connector[0]);
    } catch (error) {
      console.error("Create connector error:", error);
      res.status(500).json({ error: "Failed to create connector" });
    }
  });

  // Workflow Management
  app.get("/api/agents/:id/workflows", async (req, res) => {
    try {
      const { id } = req.params;

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.agentId, id))
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(50);

      res.json(executions);
    } catch (error) {
      console.error("Get workflows error:", error);
      res.status(500).json({ error: "Failed to get workflows" });
    }
  });

  app.post("/api/agents/:id/workflows/execute", async (req, res) => {
    try {
      const { id } = req.params;
      const { workflowId, input } = req.body;

      const execution = await db.insert(workflowExecutions).values({
        agentId: id,
        workflowId,
        input,
        status: 'pending',
      }).returning();

      // Queue the workflow for execution
      // await queueService.addJob({
      //   agentId: id,
      //   type: 'execute_workflow',
      //   data: { executionId: execution[0].id, workflow: input }
      // });

      res.json(execution[0]);
    } catch (error) {
      console.error("Execute workflow error:", error);
      res.status(500).json({ error: "Failed to execute workflow" });
    }
  });

  // Usage Analytics
  app.get("/api/analytics/usage", async (req, res) => {
    try {
      const { startDate, endDate, agentId } = req.query;

      let query = db.select().from(usageAnalytics);

      if (agentId) {
        query = query.where(eq(usageAnalytics.agentId, agentId as string));
      }

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(usageAnalytics.timestamp, new Date(startDate as string)),
            lte(usageAnalytics.timestamp, new Date(endDate as string))
          )
        );
      }

      const usage = await query.orderBy(desc(usageAnalytics.timestamp)).limit(100);

      res.json(usage);
    } catch (error) {
      console.error("Get usage analytics error:", error);
      res.status(500).json({ error: "Failed to get usage analytics" });
    }
  });

  // Agent Templates
  router.get('/api/agent-templates', async (req, res) => {
    try {
      const templates = agentTemplateService.getTemplates();
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch agent templates' });
    }
  });

  // Authentication Routes
  router.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      // Implementation would create user in database
      const user = { id: 'user_' + Date.now(), username, email, role: 'user' };
      const token = authService.generateJWT(user as any);
      res.json({ success: true, data: { user, token } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      // Implementation would verify credentials
      const user = { id: 'user_001', username, role: 'user', permissions: ['agent:read', 'agent:create'] };
      const token = authService.generateJWT(user as any);
      res.json({ success: true, data: { user, token } });
    } catch (error) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  });

  router.post('/api/auth/api-keys', authService.authenticateJWT, async (req, res) => {
    try {
      const { name, permissions, agentIds } = req.body;
      const apiKey = authService.generateApiKey(req.user.userId, name, permissions, agentIds);
      res.json({ success: true, data: apiKey });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Prompt Library Routes
  router.get('/api/prompts', async (req, res) => {
    try {
      const { category, search } = req.query;
      let templates;

      if (search) {
        templates = promptLibrary.searchTemplates(search as string);
      } else if (category) {
        templates = promptLibrary.getTemplatesByCategory(category as string);
      } else {
        templates = promptLibrary.getAllTemplates();
      }

      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
  });

  router.post('/api/prompts', authService.authenticateJWT, async (req, res) => {
    try {
      const template = promptLibrary.addTemplate(req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/api/prompts/:id/render', async (req, res) => {
    try {
      const { variables } = req.body;
      const rendered = promptLibrary.renderTemplate(req.params.id, variables);
      res.json({ success: true, data: { rendered } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/api/prompts/categories', async (req, res) => {
    try {
      const categories = promptLibrary.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
  });

  router.get('/api/prompts/top-performing', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const templates = promptLibrary.getTopPerformingTemplates(limit);
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch top performing templates' });
    }
  });

  // Billing Routes
  router.get('/api/billing/plans', async (req, res) => {
    try {
      const plans = billingService.getAllPlans();
      res.json({ success: true, data: plans });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch plans' });
    }
  });

  router.get('/api/billing/usage', authService.authenticateJWT, async (req, res) => {
    try {
      const report = billingService.generateUsageReport(req.user.userId);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to generate usage report' });
    }
  });

  router.post('/api/billing/subscribe', authService.authenticateJWT, async (req, res) => {
    try {
      const { planId } = req.body;
      const subscription = billingService.createSubscription(req.user.userId, planId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Vector Database Routes
  router.post('/api/vectors/embed', authService.authenticateJWT, async (req, res) => {
    try {
      const { text, metadata } = req.body;
      const embedding = await vectorService.createEmbedding(text, metadata);
      res.json({ success: true, data: embedding });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create embedding' });
    }
  });

  router.post('/api/vectors/search', authService.authenticateJWT, async (req, res) => {
    try {
      const { query, limit, filter } = req.body;
      const results = await vectorService.similaritySearch(query, limit, filter);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to search vectors' });
    }
  });

  // Memory Routes
  router.get('/api/agents/:agentId/memory', authService.authenticateJWT, async (req, res) => {
    try {
      const memory = await memoryService.getMemory(req.params.agentId);
      res.json({ success: true, data: memory });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch memory' });
    }
  });

  router.post('/api/agents/:agentId/memory', authService.authenticateJWT, async (req, res) => {
    try {
      const { content, type } = req.body;
      await memoryService.addMemory(req.params.agentId, content, type);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to add memory' });
    }
  });

  // Tools Routes
  router.get('/api/tools/available', async (req, res) => {
    try {
      const tools = toolsService.getAvailableTools();
      res.json({ success: true, data: tools });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch tools' });
    }
  });

  router.post('/api/tools/execute', authService.authenticateApiKey, async (req, res) => {
    try {
      const { toolName, parameters } = req.body;
      const result = await toolsService.executeTool(toolName, parameters);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to execute tool' });
    }
  });

  // Connector Routes
  router.post('/api/connectors/slack/send', authService.authenticateApiKey, async (req, res) => {
    try {
      const { channel, message } = req.body;
      const result = await slackConnector.sendMessage(channel, message);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send Slack message' });
    }
  });

  router.post('/api/connectors/telegram/send', authService.authenticateApiKey, async (req, res) => {
    try {
      const { chatId, message } = req.body;
      const result = await telegramConnector.sendMessage(chatId, message);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send Telegram message' });
    }
  });

  router.post('/api/connectors/sheets/write', authService.authenticateApiKey, async (req, res) => {
    try {
      const { spreadsheetId, range, values } = req.body;
      const result = await googleSheetsConnector.writeData(spreadsheetId, range, values);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to write to Google Sheets' });
    }
  });

  router.get('/api/connectors/sheets/read', authService.authenticateApiKey, async (req, res) => {
    try {
      const { spreadsheetId, range } = req.query;
      const result = await googleSheetsConnector.readData(spreadsheetId as string, range as string);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to read from Google Sheets' });
    }
  });

  // Agent Analytics
  router.get('/api/agents/:agentId/analytics', authService.authenticateJWT, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const usage = billingService.getUserUsage(req.user.userId, startDate as string, endDate as string);
      const agentUsage = usage.filter(u => u.agentId === req.params.agentId);

      const analytics = {
        totalRequests: agentUsage.length,
        totalTokens: agentUsage.reduce((sum, u) => sum + u.tokensUsed, 0),
        totalCost: agentUsage.reduce((sum, u) => sum + u.cost, 0),
        avgResponseTime: agentUsage.reduce((sum, u) => sum + u.computeTime, 0) / agentUsage.length || 0,
        requestsByType: agentUsage.reduce((acc: any, u) => {
          acc[u.requestType] = (acc[u.requestType] || 0) + 1;
          return acc;
        }, {}),
        dailyUsage: agentUsage.reduce((acc: any, u) => {
          const date = u.timestamp.split('T')[0];
          if (!acc[date]) acc[date] = { requests: 0, tokens: 0, cost: 0 };
          acc[date].requests++;
          acc[date].tokens += u.tokensUsed;
          acc[date].cost += u.cost;
          return acc;
        }, {}),
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  });

  // Real-time Monitoring Routes
  router.get('/api/monitoring/system', authService.authenticateJWT, async (req, res) => {
    try {
      const metrics = monitoringService.getSystemMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch system metrics' });
    }
  });

  router.get('/api/monitoring/agents', authService.authenticateJWT, async (req, res) => {
    try {
      const metrics = monitoringService.getAllAgentMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch agent metrics' });
    }
  });

  router.get('/api/monitoring/agents/:agentId', authService.authenticateJWT, async (req, res) => {
    try {
      const metrics = monitoringService.getAgentMetrics(req.params.agentId);
      if (!metrics) {
        return res.status(404).json({ success: false, error: 'Agent metrics not found' });
      }
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch agent metrics' });
    }
  });

  app.use(router);

  const httpServer = createServer(app);
  return httpServer;
}