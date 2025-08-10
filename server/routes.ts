import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

const searchSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  service_id: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
