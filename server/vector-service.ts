import { OpenAI } from 'openai';

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
}

export class VectorService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.warn('OPENAI_API_KEY not provided. Vector embeddings will be mocked for development.');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // Return mock embedding for development
      console.log('Using mock embedding for:', text.substring(0, 50) + '...');
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async storeDocument(doc: VectorDocument): Promise<void> {
    if (!doc.embedding) {
      doc.embedding = await this.generateEmbedding(doc.content);
    }

    // Store in local memory for now - in production use Pinecone/ChromaDB
    this.documents.set(doc.id, doc);
  }

  private documents = new Map<string, VectorDocument>();

  async searchSimilar(query: string, limit: number = 5): Promise<VectorDocument[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    // Simple cosine similarity calculation
    const results = Array.from(this.documents.values())
      .map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async similaritySearch(query: string, limit: number = 5, filter?: any): Promise<VectorSearchResult[]> {
    // Implementation would use actual vector database
    return [];
  }

  async createEmbedding(text: string, metadata?: any): Promise<any> {
    // Create embedding using OpenAI or other service
    return {
      id: `emb_${Date.now()}`,
      vector: new Array(1536).fill(0).map(() => Math.random()),
      text,
      metadata
    };
  }
}

// VectorService instance will be created in routes.ts to avoid initialization errors