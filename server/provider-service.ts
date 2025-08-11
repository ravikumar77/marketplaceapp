
import { db } from './db';
import { nanoid } from 'nanoid';

export interface ProviderOnboardingData {
  name: string;
  phone: string;
  displayName?: string;
  lat?: number;
  lon?: number;
  documents?: Array<{ path: string; originalName: string }>;
}

export class ProviderService {
  async onboardProvider(data: ProviderOnboardingData, documents?: Express.Multer.File[]) {
    const userId = nanoid();
    const providerId = nanoid();

    // Create user record
    await db.insert('users').values({
      id: userId,
      name: data.name,
      phone: data.phone,
      role: 'provider',
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    });

    // Process uploaded documents
    const docFiles = documents ? documents.map(file => ({
      path: file.path,
      originalName: file.originalname
    })) : [];

    // Create provider record
    await db.insert('providers').values({
      id: providerId,
      userId: userId,
      displayName: data.displayName || data.name,
      lat: data.lat || 0,
      lon: data.lon || 0,
      ratingAvg: 0,
      documents: JSON.stringify(docFiles),
      createdAt: new Date().toISOString()
    });

    return { providerId, userId };
  }

  async approveProvider(providerId: string) {
    // Get provider user ID
    const providers = await db.select().from('providers').where('id', providerId);
    if (providers.length === 0) {
      throw new Error('Provider not found');
    }

    const provider = providers[0];

    // Update user status to active
    await db.update('users')
      .set({ status: 'active' })
      .where('id', provider.userId);

    // Update provider with verification timestamp
    await db.update('providers')
      .set({ verifiedAt: new Date().toISOString() })
      .where('id', providerId);

    return { success: true };
  }

  async getPendingProviders() {
    return await db.select()
      .from('providers')
      .leftJoin('users', 'providers.userId', 'users.id')
      .where('users.status', 'pending_verification');
  }
}

export const providerService = new ProviderService();
