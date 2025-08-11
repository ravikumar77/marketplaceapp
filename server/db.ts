import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { pgTable, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Please set up your PostgreSQL database connection.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  billingCycle: text("billing_cycle").notNull(),
  features: text("features").notNull(), // JSON string
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  planId: text("plan_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull(),
  autoRenew: integer("auto_renew").notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(),
  status: text("status").default("active"),
  createdAt: text("created_at").notNull(),
});

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  ratingAvg: real("rating_avg").default(0),
  documents: text("documents"), // JSON string
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: text("provider_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  serviceType: text("service_type").notNull(),
  schedule: text("schedule").notNull(),
  status: text("status").notNull().default('pending'),
  paymentMethod: text("payment_method").notNull(),
  message: text("message"),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});