import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any, context?: any) => Promise<any>;
}

export class ToolsService {
  private tools = new Map<string, Tool>();

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, parameters: any, context?: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    try {
      const validatedParams = tool.parameters.parse(parameters);
      return await tool.execute(validatedParams, context);
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolSchema(name: string) {
    const tool = this.tools.get(name);
    return tool ? {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    } : null;
  }
}

export const toolsService = new ToolsService();

// Built-in tools
export const builtInTools = {
  webSearch: {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: z.object({
      query: z.string(),
      limit: z.number().optional().default(5)
    }),
    execute: async (params: { query: string; limit: number }) => {
      // Mock implementation - integrate with actual search API
      return {
        results: [
          {
            title: `Search result for: ${params.query}`,
            url: 'https://example.com',
            snippet: 'This is a mock search result'
          }
        ]
      };
    }
  },

  sendEmail: {
    name: 'send_email',
    description: 'Send an email',
    parameters: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string()
    }),
    execute: async (params: { to: string; subject: string; body: string }) => {
      // Mock implementation - integrate with email service
      console.log('Sending email:', params);
      return { success: true, messageId: 'mock-id' };
    }
  },

  scheduleTask: {
    name: 'schedule_task',
    description: 'Schedule a task for later execution',
    parameters: z.object({
      task: z.string(),
      scheduledFor: z.string(),
      metadata: z.record(z.any()).optional()
    }),
    execute: async (params: { task: string; scheduledFor: string; metadata?: any }) => {
      // Mock implementation - integrate with scheduler
      return { taskId: 'mock-task-id', scheduled: true };
    }
  }
};