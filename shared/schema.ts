import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, real, integer, timestamp, boolean, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("client"), // client, provider, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  displayName: text("display_name").notNull(),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }),
  defaultUnit: text("default_unit"), // per_hour, per_job, per_sqft, per_visit
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  displayName: text("display_name").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  ratingAvg: real("rating_avg").default(0),
  reviewCount: integer("review_count").default(0),
  verified: boolean("verified").default(false),
  about: text("about"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerServices = pgTable("provider_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  priceUnit: text("price_unit").notNull(),
  active: boolean("active").default(true),
  description: text("description"),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end"),
  status: text("status").notNull().default("requested"), // requested, accepted, in_progress, completed, cancelled
  priceCharged: decimal("price_charged", { precision: 10, scale: 2 }),
  address: text("address").notNull(),
  requirements: text("requirements"),
  contactNumber: text("contact_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  providers: many(providers),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, {
    fields: [providers.userId],
    references: [users.id],
  }),
  services: many(providerServices),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  providers: many(providerServices),
  bookings: many(bookings),
}));

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providers, {
    fields: [providerServices.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [providerServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
  }),
  provider: one(providers, {
    fields: [bookings.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  provider: one(providers, {
    fields: [reviews.providerId],
    references: [providers.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
});

export const insertProviderServiceSchema = createInsertSchema(providerServices).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// AI Agent Tables
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // customer_support, research, scheduling, workflow_automation, custom
  config: text("config").notNull(), // JSON string
  status: text("status").notNull().default("draft"), // draft, active, paused, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  name: text("name").notNull(),
  description: text("description"),
  definition: text("definition").notNull(), // JSON string
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentExecutions = pgTable("agent_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  workflowId: varchar("workflow_id").references(() => workflows.id),
  status: text("status").notNull(), // running, completed, failed
  input: text("input"), // JSON string
  output: text("output"), // JSON string
  error: text("error"),
  executionTime: integer("execution_time"),
  tokensUsed: integer("tokens_used"),
  cost: text("cost"), // decimal as string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  successRate: real("success_rate").default(0),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Agent Relations
export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  workflows: many(workflows),
  executions: many(agentExecutions),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  agent: one(agents, {
    fields: [workflows.agentId],
    references: [agents.id],
  }),
  executions: many(agentExecutions),
}));

export const agentExecutionsRelations = relations(agentExecutions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentExecutions.agentId],
    references: [agents.id],
  }),
  workflow: one(workflows, {
    fields: [agentExecutions.workflowId],
    references: [workflows.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one }) => ({
  user: one(users, {
    fields: [prompts.userId],
    references: [users.id],
  }),
}));

// Insert schemas for AI tables
export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentExecutionSchema = createInsertSchema(agentExecutions).omit({
  id: true,
  createdAt: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

// Agent Memories
export const agentMemories = pgTable("agent_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<"short_term" | "long_term">(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  relevanceScore: real("relevance_score").default(1.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentMemorySchema = createInsertSchema(agentMemories);
export const selectAgentMemorySchema = createSelectSchema(agentMemories);
export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;
export type AgentMemory = z.infer<typeof selectAgentMemorySchema>;

// Platform Connectors
export const platformConnectors = pgTable("platform_connectors", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  platform: text("platform").notNull().$type<"slack" | "telegram" | "whatsapp" | "teams" | "google_sheets" | "notion" | "airtable">(),
  config: jsonb("config").notNull(),
  status: text("status").notNull().$type<"active" | "inactive" | "error">().default("inactive"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformConnectorSchema = createInsertSchema(platformConnectors);
export const selectPlatformConnectorSchema = createSelectSchema(platformConnectors);
export type InsertPlatformConnector = z.infer<typeof insertPlatformConnectorSchema>;
export type PlatformConnector = z.infer<typeof selectPlatformConnectorSchema>;

// Workflow Executions
export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").notNull(),
  status: text("status").notNull().$type<"pending" | "running" | "completed" | "failed">().default("pending"),
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // in milliseconds
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);
export const selectWorkflowExecutionSchema = createSelectSchema(workflowExecutions);
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
export type WorkflowExecution = z.infer<typeof selectWorkflowExecutionSchema>;

// Usage Analytics
export const usageAnalytics = pgTable("usage_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull().$type<"ai_request" | "workflow_execution" | "api_call" | "storage">(),
  resourceId: text("resource_id"),
  quantity: integer("quantity").notNull().default(1),
  cost: real("cost").default(0),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUsageAnalyticsSchema = createInsertSchema(usageAnalytics);
export const selectUsageAnalyticsSchema = createSelectSchema(usageAnalytics);
export type InsertUsageAnalytics = z.infer<typeof insertUsageAnalyticsSchema>;
export type UsageAnalytics = z.infer<typeof selectUsageAnalyticsSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type ProviderService = typeof providerServices.$inferSelect;
export type InsertProviderService = z.infer<typeof insertProviderServiceSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// AI Agent Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type InsertAgentExecution = z.infer<typeof insertAgentExecutionSchema>;

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;