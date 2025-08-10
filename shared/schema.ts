import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
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
