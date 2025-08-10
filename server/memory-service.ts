
import { db } from './db';
import { agentMemories } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'short_term' | 'long_term';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  relevanceScore?: number;
}

export class MemoryService {
  async addMemory(agentId: string, content: string, type: 'short_term' | 'long_term', metadata?: Record<string, any>): Promise<void> {
    await this.storeMemory(agentId, content, type, metadata);
  }

  async getMemory(agentId: string): Promise<MemoryEntry[]> {
    return await this.getMemories(agentId);
  }

  async storeMemory(agentId: string, content: string, type: 'short_term' | 'long_term', metadata?: Record<string, any>): Promise<void> {
    await db.insert(agentMemories).values({
      agentId,
      type,
      content,
      metadata,
      timestamp: new Date(),
      relevanceScore: 1.0
    });
  }

  async getMemories(agentId: string, type?: 'short_term' | 'long_term', limit: number = 10): Promise<MemoryEntry[]> {
    const query = db
      .select()
      .from(agentMemories)
      .where(type ? and(eq(agentMemories.agentId, agentId), eq(agentMemories.type, type)) : eq(agentMemories.agentId, agentId))
      .orderBy(desc(agentMemories.timestamp))
      .limit(limit);

    return await query;
  }

  async clearShortTermMemory(agentId: string): Promise<void> {
    await db.delete(agentMemories).where(
      and(
        eq(agentMemories.agentId, agentId),
        eq(agentMemories.type, 'short_term')
      )
    );
  }

  async searchRelevantMemories(agentId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    // Simple text matching - in production, use vector similarity
    const memories = await this.getMemories(agentId, undefined, 50);
    return memories
      .filter(memory => memory.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }
}



export const memoryService = new MemoryService();
