import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import Stripe from 'stripe';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { serveStatic } from "./vite";
import { WebSocketService } from "./websocket-service";
import { QueueService } from "./queue-service";
import { MemoryService } from "./memory-service";
import { ToolsService, builtInTools } from "./tools-service";
import { VectorService } from "./vector-service";
import { monitoringService } from "./monitoring-service";
import { log } from "node:util";
import { createServer } from "node:http";

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  console.error("Please ensure your .env file contains a valid DATABASE_URL");
  process.exit(1);
}

const app = express();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET || 'sk_test_placeholder');

// Setup file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Raw body parser for webhooks
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return express.raw({ type: 'application/json' })(req, res, next);
  }
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: false }));

// Initialize services
const queueService = new QueueService();
const memoryService = new MemoryService();
const toolsService = new ToolsService();
const vectorService = new VectorService();

// Initialize subscription plans
import { subscriptionService } from './subscription-service';
subscriptionService.initializePlans().catch(console.error);

// Register built-in tools
Object.values(builtInTools).forEach(tool => {
  toolsService.registerTool(tool);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize WebSocket service after HTTP server is created
  const websocketService = new WebSocketService(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();