import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIProvider {
  name: string;
  models: string[];
  costPerToken: number;
  maxTokens: number;
  speed: number; // relative speed score
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    costPerToken: 0.00003,
    maxTokens: 128000,
    speed: 8
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    costPerToken: 0.000015,
    maxTokens: 200000,
    speed: 7
  },
  google: {
    name: 'Google',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    costPerToken: 0.0000125,
    maxTokens: 1000000,
    speed: 9
  }
};

interface ModelConfig {
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: string;
  tokensUsed: number;
  cost: number;
  provider: string;
  model: string;
}

export class AIEngine {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private google?: GoogleGenerativeAI;
  private ollamaClient: OpenAI;
  private lmStudioClient: OpenAI;
  private vllmClient: OpenAI;
  private modelConfigs: Map<string, ModelConfig>;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }

    // Self-hosted LLM clients
    this.ollamaClient = new OpenAI({
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      apiKey: 'ollama', // Ollama doesn't require real API key
    });

    this.lmStudioClient = new OpenAI({
      baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      apiKey: 'lm-studio',
    });

    this.vllmClient = new OpenAI({
      baseURL: process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
      apiKey: 'vllm',
    });

    // Initialize model configurations
    this.modelConfigs = new Map<string, ModelConfig>();
    this.initializeModelConfigs();

    if (!this.openai && !this.anthropic && !this.google) {
      console.warn('No AI provider API keys configured. AI features will return mock responses.');
    }
  }

  private initializeModelConfigs() {
    // Default configurations, can be extended or loaded from a config file
    this.modelConfigs.set('gpt-4', { maxTokens: 8192, temperature: 0.7 });
    this.modelConfigs.set('gpt-4-turbo', { maxTokens: 128000, temperature: 0.7 });
    this.modelConfigs.set('gpt-3.5-turbo', { maxTokens: 4096, temperature: 0.7 });
    this.modelConfigs.set('claude-3-5-sonnet-20241022', { maxTokens: 200000, temperature: 0.7 });
    this.modelConfigs.set('claude-3-haiku-20240307', { maxTokens: 200000, temperature: 0.7 });
    this.modelConfigs.set('gemini-1.5-pro', { maxTokens: 1000000, temperature: 0.7 });
    this.modelConfigs.set('gemini-1.5-flash', { maxTokens: 1000000, temperature: 0.7 });
  }

  selectOptimalModel(requirements: {
    priority: 'cost' | 'speed' | 'accuracy';
    maxTokens?: number;
    complexity?: 'low' | 'medium' | 'high';
  }): { provider: string; model: string } {
    const available = Object.entries(AI_PROVIDERS).filter(([key]) => {
      switch (key) {
        case 'openai': return !!this.openai;
        case 'anthropic': return !!this.anthropic;
        case 'google': return !!this.google;
        default: return false;
      }
    });

    if (available.length === 0) {
      throw new Error('No AI providers configured');
    }

    // Simple selection logic based on priority
    if (requirements.priority === 'cost') {
      // Prioritize cost-effective models
      let bestModel = available.reduce((best, [, providerInfo]) => {
        const cheapestModel = providerInfo.models.reduce((cheapest, modelName) => {
          const modelInfo = AI_PROVIDERS[providerInfo.name.toLowerCase()]?.models.find(m => m === modelName);
          if (modelInfo && (!cheapest.model || AI_PROVIDERS[providerInfo.name.toLowerCase()].costPerToken < AI_PROVIDERS[cheapest.provider?.toLowerCase() ?? ''].costPerToken)) {
            return { model: modelName, provider: providerInfo.name.toLowerCase() };
          }
          return cheapest;
        }, { model: null, provider: null });
        if (cheapestModel.model && (!best.model || AI_PROVIDERS[cheapestModel.provider].costPerToken < AI_PROVIDERS[best.provider].costPerToken)) {
          return cheapestModel;
        }
        return best;
      }, { model: null, provider: null });

      if (!bestModel.model) {
        // Fallback if no models found or cost calculation fails
        return { provider: 'google', model: 'gemini-1.5-flash' };
      }
      return bestModel as { provider: string; model: string };

    } else if (requirements.priority === 'speed') {
      // Prioritize fast models
      let bestModel = available.reduce((best, [, providerInfo]) => {
        const fastestModel = providerInfo.models.reduce((fastest, modelName) => {
          const modelInfo = AI_PROVIDERS[providerInfo.name.toLowerCase()]?.models.find(m => m === modelName);
          if (modelInfo && (!fastest.model || AI_PROVIDERS[providerInfo.name.toLowerCase()].speed > AI_PROVIDERS[fastest.provider?.toLowerCase() ?? ''].speed)) {
            return { model: modelName, provider: providerInfo.name.toLowerCase() };
          }
          return fastest;
        }, { model: null, provider: null });
        if (fastestModel.model && (!best.model || AI_PROVIDERS[fastestModel.provider].speed > AI_PROVIDERS[best.provider].speed)) {
          return fastestModel;
        }
        return best;
      }, { model: null, provider: null });

      if (!bestModel.model) {
        // Fallback
        return { provider: 'google', model: 'gemini-1.5-flash' };
      }
      return bestModel as { provider: string; model: string };
    } else {
      // Prioritize accuracy
      // For now, Anthropic's Claude 3.5 Sonnet is generally considered highly accurate
      return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
    }
  }

  async generateResponse(
    prompt: string,
    options: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemMessage?: string;
    } = {}
  ): Promise<AIResponse> {
    const { provider: specifiedProvider, model: specifiedModel } = options;

    let providerName: string;
    let modelName: string;

    if (specifiedProvider && specifiedModel) {
      providerName = specifiedProvider;
      modelName = specifiedModel;
    } else {
      const optimal = this.selectOptimalModel({ priority: 'accuracy' }); // Default to accuracy
      providerName = optimal.provider;
      modelName = optimal.model;
    }

    const providerConfig = AI_PROVIDERS[providerName];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    const modelConfig = this.modelConfigs.get(modelName) || {};
    const temperature = options.temperature ?? modelConfig.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? modelConfig.maxTokens ?? 1000;


    try {
      switch (providerName) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI not configured');
          const openaiResponse = await this.openai.chat.completions.create({
            model: modelName,
            messages: [
              ...(options.systemMessage ? [{ role: 'system' as const, content: options.systemMessage }] : []),
              { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: maxTokens,
          });

          const openaiContent = openaiResponse.choices[0]?.message?.content || '';
          const openaiTokens = openaiResponse.usage?.total_tokens || 0;

          return {
            content: openaiContent,
            tokensUsed: openaiTokens,
            cost: openaiTokens * (providerConfig.costPerToken || 0),
            provider: providerName,
            model: modelName
          };

        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic not configured');
          const anthropicResponse = await this.anthropic.messages.create({
            model: modelName,
            max_tokens: maxTokens,
            temperature,
            system: options.systemMessage,
            messages: [{ role: 'user', content: prompt }]
          });

          const anthropicContent = anthropicResponse.content[0]?.type === 'text'
            ? anthropicResponse.content[0].text : '';
          const anthropicTokens = (anthropicResponse.usage.input_tokens || 0) + (anthropicResponse.usage.output_tokens || 0);

          return {
            content: anthropicContent,
            tokensUsed: anthropicTokens,
            cost: anthropicTokens * (providerConfig.costPerToken || 0),
            provider: providerName,
            model: modelName
          };

        case 'google':
          if (!this.google) throw new Error('Google AI not configured');
          const googleModel = this.google.getGenerativeModel({ model: modelName });
          const googleResponse = await googleModel.generateContent([
            ...(options.systemMessage ? [options.systemMessage] : []),
            prompt
          ]);

          const googleContent = googleResponse.response.text();
          const googleTokens = googleResponse.response.usageMetadata?.totalTokenCount || 0;

          return {
            content: googleContent,
            tokensUsed: googleTokens,
            cost: googleTokens * (providerConfig.costPerToken || 0),
            provider: providerName,
            model: modelName
          };

        case 'ollama':
          const ollamaModel = modelName.startsWith('ollama:') ? modelName.replace('ollama:', '') : modelName;
          const ollamaResponse = await this.ollamaClient.chat.completions.create({
            model: ollamaModel,
            messages: [
              ...(options.systemMessage ? [{ role: 'system' as const, content: options.systemMessage }] : []),
              { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: maxTokens,
          });
          const ollamaContent = ollamaResponse.choices[0]?.message?.content || '';
          const ollamaTokens = ollamaResponse.usage?.total_tokens || 0;
          return {
            content: ollamaContent,
            tokensUsed: ollamaTokens,
            cost: 0, // Self-hosted models are free
            provider: 'ollama',
            model: ollamaModel
          };

        case 'lmstudio':
          const lmStudioModel = modelName.startsWith('lmstudio:') ? modelName.replace('lmstudio:', '') : modelName;
          const lmStudioResponse = await this.lmStudioClient.chat.completions.create({
            model: lmStudioModel,
            messages: [
              ...(options.systemMessage ? [{ role: 'system' as const, content: options.systemMessage }] : []),
              { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: maxTokens,
          });
          const lmStudioContent = lmStudioResponse.choices[0]?.message?.content || '';
          const lmStudioTokens = lmStudioResponse.usage?.total_tokens || 0;
          return {
            content: lmStudioContent,
            tokensUsed: lmStudioTokens,
            cost: 0,
            provider: 'lmstudio',
            model: lmStudioModel
          };

        case 'vllm':
          const vllmModel = modelName.startsWith('vllm:') ? modelName.replace('vllm:', '') : modelName;
          const vllmResponse = await this.vllmClient.chat.completions.create({
            model: vllmModel,
            messages: [
              ...(options.systemMessage ? [{ role: 'system' as const, content: options.systemMessage }] : []),
              { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: maxTokens,
          });
          const vllmContent = vllmResponse.choices[0]?.message?.content || '';
          const vllmTokens = vllmResponse.usage?.total_tokens || 0;
          return {
            content: vllmContent,
            tokensUsed: vllmTokens,
            cost: 0,
            provider: 'vllm',
            model: vllmModel
          };

        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }
    } catch (error) {
      console.error(`AI generation error for ${providerName}:${modelName}`, error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper to get the provider instance for a given model name
  private getProviderForModel(modelName: string): { name: string; generateResponse: (prompt: string, options: { model?: string; temperature?: number; maxTokens?: number; systemMessage?: string; }) => Promise<AIResponse> } | null {
    if (modelName.startsWith('gpt-') || modelName.startsWith('gpt-4')) {
      return { name: 'openai', generateResponse: this.generateResponse.bind(this, '', { provider: 'openai', model: modelName }) };
    } else if (modelName.startsWith('claude-')) {
      return { name: 'anthropic', generateResponse: this.generateResponse.bind(this, '', { provider: 'anthropic', model: modelName }) };
    } else if (modelName.startsWith('gemini-')) {
      return { name: 'google', generateResponse: this.generateResponse.bind(this, '', { provider: 'google', model: modelName }) };
    } else if (modelName.startsWith('ollama:')) {
      return { name: 'ollama', generateResponse: this.generateResponse.bind(this, '', { provider: 'ollama', model: modelName.replace('ollama:', '') }) };
    } else if (modelName.startsWith('lmstudio:')) {
      return { name: 'lmstudio', generateResponse: this.generateResponse.bind(this, '', { provider: 'lmstudio', model: modelName.replace('lmstudio:', '') }) };
    } else if (modelName.startsWith('vllm:')) {
      return { name: 'vllm', generateResponse: this.generateResponse.bind(this, '', { provider: 'vllm', model: modelName.replace('vllm:', '') }) };
    }
    return null;
  }

  // Placeholder for logging usage analytics
  private async logUsage(agentId: string, model: string, tokensUsed: number): Promise<void> {
    console.log(`Logging usage for agent ${agentId}: model ${model}, tokens ${tokensUsed}`);
    // In a real application, this would interact with a database or analytics service
  }

  // Placeholder for model switching logic
  private getOptimalModel(message: string): string {
    const messageLength = message.length;
    const complexity = this.analyzeComplexity(message);

    // Auto-select based on cost, speed, accuracy
    if (messageLength < 100 && complexity.isSimple) {
      return 'gpt-3.5-turbo'; // Fast and cheap for simple tasks
    } else if (complexity.requiresReasoning) {
      return 'gpt-4'; // Best for complex reasoning
    } else if (complexity.isCreative) {
      return 'claude-3-5-sonnet-20241022'; // Good for creative tasks
    } else {
      return 'gemini-1.5-pro'; // Balanced option
    }
  }

  // Placeholder for complexity analysis
  private analyzeComplexity(message: string): {
    isSimple: boolean;
    requiresReasoning: boolean;
    isCreative: boolean;
  } {
    const reasoningKeywords = ['analyze', 'compare', 'explain', 'solve', 'calculate'];
    const creativeKeywords = ['write', 'create', 'design', 'imagine', 'story'];
    const simpleKeywords = ['what', 'when', 'where', 'who'];

    const lowerMessage = message.toLowerCase();

    return {
      isSimple: simpleKeywords.some(keyword => lowerMessage.includes(keyword)) && message.length < 50,
      requiresReasoning: reasoningKeywords.some(keyword => lowerMessage.includes(keyword)),
      isCreative: creativeKeywords.some(keyword => lowerMessage.includes(keyword)),
    };
  }

  // Placeholder for applying fine-tuning
  async applyFineTuning(message: string, agentId?: string): Promise<string> {
    if (!agentId) return message;

    // Get agent-specific knowledge base
    const domainKnowledge = await this.getDomainKnowledge(agentId);
    if (!domainKnowledge.length) return message;

    // Inject domain-specific context
    const contextPrompt = `
Context: You are an AI agent with the following domain expertise:
${domainKnowledge.map(k => `- ${k.content}`).join('\n')}

User Query: ${message}

Please respond based on your domain expertise while being helpful and accurate.
    `;

    return contextPrompt;
  }

  // Placeholder for fetching domain knowledge
  private async getDomainKnowledge(agentId: string): Promise<Array<{content: string}>> {
    // This would typically fetch from vector database or a knowledge base service
    // For now, return empty array to avoid breaking functionality
    return [];
  }

  // Placeholder for creating fine-tuned models
  async createFineTunedModel(baseModel: string, trainingData: Array<{input: string, output: string}>): Promise<string> {
    // Implementation for fine-tuning models would be provider-specific
    const providerInfo = Object.entries(AI_PROVIDERS).find(([key, value]) =>
      value.models.includes(baseModel) || key === baseModel.toLowerCase()
    );

    if (!providerInfo) {
      throw new Error(`Provider for base model ${baseModel} not found.`);
    }

    const [providerKey, providerDetails] = providerInfo;

    if (providerKey === 'openai') {
      // Placeholder for OpenAI fine-tuning API call
      console.log(`Initiating OpenAI fine-tuning for model: ${baseModel} with ${trainingData.length} examples.`);
      // In a real scenario, you'd interact with the OpenAI API to upload data and create a fine-tuned model
      const fineTunedModelName = `${baseModel}-ft-${Date.now()}`;
      return fineTunedModelName;
    } else {
      throw new Error(`Fine-tuning not supported for provider: ${providerDetails.name}`);
    }
  }
}

export const aiEngine = new AIEngine();