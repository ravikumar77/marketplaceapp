import { 
  users, providers, services, providerServices, bookings, reviews,
  type User, type InsertUser, type Provider, type InsertProvider,
  type Service, type InsertService, type ProviderService, type InsertProviderService,
  type Booking, type InsertBooking, type Review, type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Services
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  
  // Providers
  getProvider(id: string): Promise<Provider | undefined>;
  getProviderWithServices(id: string): Promise<(Provider & { services: (ProviderService & { service: Service })[] }) | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  
  // Provider Services
  createProviderService(providerService: InsertProviderService): Promise<ProviderService>;
  
  // Search
  searchProviders(lat: number, lon: number, serviceId: string, limit?: number): Promise<(Provider & { 
    services: (ProviderService & { service: Service })[], 
    distance: number 
  })[]>;
  
  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  
  // Reviews
  getProviderReviews(providerId: string, limit?: number): Promise<(Review & { client: User })[]>;
  
  // Seed data
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async getProvider(id: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider || undefined;
  }

  async getProviderWithServices(id: string): Promise<(Provider & { services: (ProviderService & { service: Service })[] }) | undefined> {
    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, id),
      with: {
        services: {
          with: {
            service: true,
          },
        },
      },
    });
    return provider || undefined;
  }

  async createProvider(insertProvider: InsertProvider): Promise<Provider> {
    const [provider] = await db
      .insert(providers)
      .values(insertProvider)
      .returning();
    return provider;
  }

  async createProviderService(insertProviderService: InsertProviderService): Promise<ProviderService> {
    const [providerService] = await db
      .insert(providerServices)
      .values(insertProviderService)
      .returning();
    return providerService;
  }

  async searchProviders(lat: number, lon: number, serviceId: string, limit = 20): Promise<(Provider & { 
    services: (ProviderService & { service: Service })[], 
    distance: number 
  })[]> {
    // Use Haversine formula to calculate distance
    const haversineDistance = sql<number>`
      6371 * acos(
        cos(radians(${lat})) * cos(radians(${providers.lat})) * 
        cos(radians(${providers.lon}) - radians(${lon})) + 
        sin(radians(${lat})) * sin(radians(${providers.lat}))
      )
    `;

    const providersWithDistance = await db
      .select({
        provider: providers,
        distance: haversineDistance,
      })
      .from(providers)
      .innerJoin(providerServices, eq(providers.id, providerServices.providerId))
      .where(
        and(
          eq(providerServices.serviceId, serviceId),
          eq(providerServices.active, true)
        )
      )
      .orderBy(haversineDistance)
      .limit(limit);

    // Get provider services for each provider
    const enrichedProviders = await Promise.all(
      providersWithDistance.map(async (item) => {
        const services = await db.query.providerServices.findMany({
          where: and(
            eq(providerServices.providerId, item.provider.id),
            eq(providerServices.active, true)
          ),
          with: {
            service: true,
          },
        });

        return {
          ...item.provider,
          services,
          distance: item.distance,
        };
      })
    );

    return enrichedProviders;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getProviderReviews(providerId: string, limit = 10): Promise<(Review & { client: User })[]> {
    return await db.query.reviews.findMany({
      where: eq(reviews.providerId, providerId),
      with: {
        client: true,
      },
      orderBy: [desc(reviews.createdAt)],
      limit,
    });
  }

  async seedData(): Promise<void> {
    // Check if data already exists
    const existingServices = await this.getAllServices();
    if (existingServices.length > 0) {
      return; // Data already seeded
    }

    // Create demo users first
    const user1 = await this.createUser({
      username: "ramesh.kumar",
      password: "demo-password",
      name: "Ramesh Kumar",
      phone: "+91 9876543210",
      role: "provider",
    });

    const user2 = await this.createUser({
      username: "sita.devi",
      password: "demo-password",
      name: "Sita Devi",
      phone: "+91 9876543211",
      role: "provider",
    });

    const user3 = await this.createUser({
      username: "arjun.singh",
      password: "demo-password",
      name: "Arjun Singh",
      phone: "+91 9876543212",
      role: "provider",
    });

    const user4 = await this.createUser({
      username: "priya.sharma",
      password: "demo-password",
      name: "Priya Sharma",
      phone: "+91 9876543213",
      role: "provider",
    });

    const user5 = await this.createUser({
      username: "rakesh.gupta",
      password: "demo-password",
      name: "Rakesh Gupta",
      phone: "+91 9876543214",
      role: "provider",
    });

    const user6 = await this.createUser({
      username: "deepak.mehta",
      password: "demo-password",
      name: "Deepak Mehta",
      phone: "+91 9876543215",
      role: "provider",
    });

    // Create demo client user
    const clientUser = await this.createUser({
      username: "demo.client",
      password: "demo-password",
      name: "Demo Client",
      phone: "+91 9876543216",
      role: "client",
    });

    // Create services
    const cleaningService = await this.createService({
      code: "cleaning",
      displayName: "🏠 Home Cleaning",
      defaultPrice: "300",
      defaultUnit: "per_hour",
    });

    const plumbingService = await this.createService({
      code: "plumbing",
      displayName: "🔧 Plumbing",
      defaultPrice: "600",
      defaultUnit: "per_job",
    });

    const electricalService = await this.createService({
      code: "electrical",
      displayName: "⚡ Electrical",
      defaultPrice: "450",
      defaultUnit: "per_hour",
    });

    const paintingService = await this.createService({
      code: "painting",
      displayName: "🎨 Painting",
      defaultPrice: "400",
      defaultUnit: "per_sqft",
    });

    const gardeningService = await this.createService({
      code: "gardening",
      displayName: "🌱 Gardening",
      defaultPrice: "350",
      defaultUnit: "per_visit",
    });

    // Create sample providers with Delhi coordinates
    const provider1 = await this.createProvider({
      userId: user1.id,
      displayName: "Ramesh Kumar",
      lat: 28.6139,
      lon: 77.2090,
      ratingAvg: 4.9,
      reviewCount: 127,
      verified: true,
      about: "With over 8 years of experience in professional cleaning services, I provide thorough and reliable home cleaning solutions. I use eco-friendly products and ensure customer satisfaction with every service.",
    });

    const provider2 = await this.createProvider({
      userId: user2.id,
      displayName: "Sita Devi",
      lat: 28.7041,
      lon: 77.1025,
      ratingAvg: 4.6,
      reviewCount: 89,
      verified: true,
      about: "Experienced plumber with 10+ years in residential and commercial plumbing. Available for emergency repairs and installations.",
    });

    const provider3 = await this.createProvider({
      userId: user3.id,
      displayName: "Arjun Singh",
      lat: 28.5355,
      lon: 77.3910,
      ratingAvg: 4.8,
      reviewCount: 156,
      verified: true,
      about: "Licensed electrician specializing in home electrical work, installations, and repairs. Safety is my top priority.",
    });

    const provider4 = await this.createProvider({
      userId: user4.id,
      displayName: "Priya Sharma",
      lat: 28.4595,
      lon: 77.0266,
      ratingAvg: 4.7,
      reviewCount: 94,
      verified: true,
      about: "Professional painter with expertise in interior and exterior painting. Quality work with attention to detail.",
    });

    const provider5 = await this.createProvider({
      userId: user5.id,
      displayName: "Rakesh Gupta",
      lat: 28.6692,
      lon: 77.4538,
      ratingAvg: 4.5,
      reviewCount: 72,
      verified: true,
      about: "Garden maintenance specialist offering comprehensive landscaping and gardening services.",
    });

    const provider6 = await this.createProvider({
      userId: user6.id,
      displayName: "Deepak Mehta",
      lat: 28.5244,
      lon: 77.1855,
      ratingAvg: 4.9,
      reviewCount: 201,
      verified: true,
      about: "Appliance repair expert with experience in all major brands. Quick diagnosis and efficient repairs.",
    });

    // Create provider services
    await this.createProviderService({
      providerId: provider1.id,
      serviceId: cleaningService.id,
      basePrice: "300",
      priceUnit: "per_hour",
      active: true,
      description: "Regular house cleaning service",
    });

    await this.createProviderService({
      providerId: provider2.id,
      serviceId: plumbingService.id,
      basePrice: "600",
      priceUnit: "per_job",
      active: true,
      description: "General plumbing services",
    });

    await this.createProviderService({
      providerId: provider3.id,
      serviceId: electricalService.id,
      basePrice: "450",
      priceUnit: "per_hour",
      active: true,
      description: "Electrical installation and repair",
    });

    await this.createProviderService({
      providerId: provider4.id,
      serviceId: paintingService.id,
      basePrice: "400",
      priceUnit: "per_sqft",
      active: true,
      description: "Interior and exterior painting",
    });

    await this.createProviderService({
      providerId: provider5.id,
      serviceId: gardeningService.id,
      basePrice: "350",
      priceUnit: "per_visit",
      active: true,
      description: "Garden maintenance and landscaping",
    });

    await this.createProviderService({
      providerId: provider6.id,
      serviceId: electricalService.id,
      basePrice: "500",
      priceUnit: "per_diagnosis",
      active: true,
      description: "Appliance repair and diagnosis",
    });
  }
}

export const storage = new DatabaseStorage();
