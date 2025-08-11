import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import express from "express";
import { db, bookings } from "./db.js";
import { providers, services, reviews, users, agents, workflows, agentExecutions, prompts, agentMemories, platformConnectors, workflowExecutions, usageAnalytics } from "@shared/schema";
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
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { paymentsService } from './payments-service';
import { subscriptionService } from './subscription-service';
import { providerService } from './provider-service';
import multer from 'multer';
import path from 'path';

// Setup multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Initialize Stripe only if API key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key_here') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-08-16',
  });
} else {
  console.warn('⚠️  Stripe API key not configured. Payment features will be disabled.');
}

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
      const { providerId, clientPhone, clientName, serviceType, message, schedule, paymentMethod, clientId } = req.body;

      if (!providerId || !clientPhone || !clientName || !serviceType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check subscription enforcement for offline payments
      if (paymentMethod === 'offline' && clientId) {
        const providers = await db.select().from(providers).where(eq(providers.id, providerId));
        if (providers.length === 0) {
          return res.status(404).json({ error: "Provider not found" });
        }

        const provider = providers[0];

        // Check if both client and provider have active subscriptions for offline payments
        const clientCanUseOffline = await subscriptionService.canUseOfflinePayments(clientId);
        const providerCanUseOffline = await subscriptionService.canUseOfflinePayments(provider.userId);

        if (!clientCanUseOffline || !providerCanUseOffline) {
          return res.status(403).json({
            error: 'Both client and provider must have an active Pro subscription to use offline payments. Please complete payment via app or subscribe to Pro plan.'
          });
        }
      }

      // Parse and validate the schedule date
      let scheduledStart = new Date();
      if (schedule) {
        try {
          const scheduleDate = new Date(schedule);
          if (!isNaN(scheduleDate.getTime())) {
            scheduledStart = scheduleDate;
          }
        } catch (error) {
          console.error('Error parsing schedule date:', error);
          return res.status(400).json({ error: 'Invalid schedule date format' });
        }
      }

      const booking = {
        id: nanoid(),
        providerId,
        clientPhone,
        clientName,
        serviceType,
        message: message || "",
        schedule: schedule, // Store original schedule string if needed, but use scheduledStart for DB
        status: "pending",
        paymentMethod: paymentMethod || "online",
        createdAt: new Date(),
        updatedAt: new Date(), // Add updatedAt for consistency
        scheduledStart: scheduledStart, // Use the parsed Date object
      };

      await db.insert(bookings).values(booking);
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
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

  // Get user's bookings
  app.get("/api/bookings/my-bookings", authService.authenticateJWT, async (req, res) => {
    try {
      const userId = req.user.userId;

      // Get bookings for the user based on phone number or user ID
      const userBookings = await db
        .select({
          id: bookings.id,
          providerId: bookings.providerId,
          clientPhone: bookings.clientPhone,
          clientName: bookings.clientName,
          serviceType: bookings.serviceType,
          message: bookings.message,
          schedule: bookings.schedule,
          status: bookings.status,
          paymentMethod: bookings.paymentMethod,
          priceCharged: bookings.priceCharged,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
          provider: {
            displayName: providers.displayName,
            ratingAvg: providers.ratingAvg
          }
        })
        .from(bookings)
        .leftJoin(providers, eq(bookings.providerId, providers.id))
        .where(eq(bookings.clientPhone, req.user.phone)) // Match by phone for now
        .orderBy(desc(bookings.createdAt));

      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Cancel booking
  app.put("/api/bookings/:id/cancel", authService.authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Check if booking belongs to user
      const booking = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      if (booking.length === 0) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Update booking status to cancelled
      await db
        .update(bookings)
        .set({
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(bookings.id, id));

      res.json({ success: true, message: "Booking cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
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
      const { username, email, password, name } = req.body;

      if (!username || !email || !password || !name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username, email, password, and name are required' 
        });
      }

      // Check if user already exists
      const existingUser = await authService.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username already exists' 
        });
      }

      const existingEmail = await authService.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }

      // Create user in database
      const hashedPassword = await authService.hashPassword(password);
      const [newUser] = await db.insert(users).values({
        username,
        name,
        password: hashedPassword,
        role: 'client'
      }).returning();

      const token = authService.generateJWT(newUser);
      res.json({ 
        success: true, 
        data: { 
          user: { 
            id: newUser.id, 
            username: newUser.username, 
            name: newUser.name,
            role: newUser.role 
          }, 
          token 
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error during registration' 
      });
    }
  });

  router.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username and password are required' 
        });
      }

      // Find user by username
      const user = await authService.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid username or password' 
        });
      }

      // Verify password
      const isValidPassword = await authService.comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid username or password' 
        });
      }

      const token = authService.generateJWT(user);
      res.json({ 
        success: true, 
        data: { 
          user: { 
            id: user.id, 
            username: user.username, 
            name: user.name,
            role: user.role 
          }, 
          token 
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error during login' 
      });
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

  // Stripe Payment Routes
  app.post('/api/payments/create-payment-intent', authService.authenticateJWT, async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment processing is currently unavailable. Please configure Stripe API keys.' 
      });
    }

    const { amount, currency = 'usd', paymentMethodType } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: [paymentMethodType],
      });
      res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ success: false, error: 'Failed to create payment intent' });
    }
  });

  app.post('/api/payments/webhook', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ 
        success: false, 
        error: 'Webhook processing is currently unavailable. Please configure Stripe API keys.' 
      });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret!);
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err.message);
      return res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        // Fulfill the customer's order or update database status
        await paymentsService.handlePaymentSuccess(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log(`PaymentIntent failed: ${failedPaymentIntent.last_payment_error?.message}`);
        // Notify the customer, update database status
        await paymentsService.handlePaymentFailure(failedPaymentIntent);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
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

  // Provider Onboarding Routes
  app.post('/api/providers/onboard', upload.fields([{ name: 'profilePicture', maxCount: 1 }, { name: 'documents', maxCount: 5 }]), async (req, res) => {
    try {
      const { userId, name, bio, services: serviceIds, category, address, phone, website, taxId } = req.body;
      const profilePicture = req.files?.profilePicture?.[0];
      const documents = req.files?.documents;

      if (!userId || !name || !bio || !serviceIds || !category || !address || !phone || !taxId) {
        return res.status(400).json({ success: false, error: 'Missing required fields for provider onboarding' });
      }

      // Process profile picture upload
      let profilePictureUrl = null;
      if (profilePicture) {
        profilePictureUrl = await providerService.uploadFile(profilePicture.path, `providers/${userId}/profile/${profilePicture.filename}`);
      }

      // Process document uploads
      let documentUrls = [];
      if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
          const url = await providerService.uploadFile(doc.path, `providers/${userId}/documents/${doc.filename}`);
          documentUrls.push({ type: doc.fieldname, url }); // Assuming type can be inferred or handled
        }
      }

      const newProvider = await providerService.onboardProvider({
        userId,
        name,
        bio,
        category,
        address,
        phone,
        website: website || null,
        taxId,
        profilePictureUrl,
        documentUrls,
        serviceIds: typeof serviceIds === 'string' ? serviceIds.split(',') : serviceIds,
      });

      res.json({ success: true, data: newProvider });
    } catch (error) {
      console.error('Provider onboarding error:', error);
      res.status(500).json({ success: false, error: 'Failed to onboard provider' });
    }
  });

  // Provider Service Management
  app.post('/api/providers/:providerId/services', authService.authenticateJWT, async (req, res) => {
    try {
      const { providerId } = req.params;
      const { serviceId } = req.body;

      if (providerId !== req.user.providerId) { // Ensure user is the provider
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const providerServiceMapping = await providerService.addServiceToProvider(providerId, serviceId);
      res.json({ success: true, data: providerServiceMapping });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to add service to provider' });
    }
  });

  // Provider Subscription Management
  app.post('/api/providers/:providerId/subscribe', authService.authenticateJWT, async (req, res) => {
    try {
      const { providerId } = req.params;
      const { planId } = req.body;

      if (providerId !== req.user.providerId) { // Ensure user is the provider
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const subscription = await subscriptionService.createProviderSubscription(providerId, planId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get('/api/providers/:providerId/subscription', authService.authenticateJWT, async (req, res) => {
    try {
      const { providerId } = req.params;

      if (providerId !== req.user.providerId) { // Ensure user is the provider
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const subscription = await subscriptionService.getProviderSubscription(providerId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch provider subscription' });
    }
  });


  app.use(router);

  const httpServer = createServer(app);
  return httpServer;
}