import { db } from './db.js';
import { agents, workflows, agentExecutions, prompts, workflowExecutions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { aiEngine } from './ai-engine.js';
import { monitoringService } from "./monitoring-service.js";

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'decision' | 'ai_process';
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export class AgentService {
  async createAgent(
    userId: string,
    data: {
      name: string;
      description?: string;
      type: 'customer_support' | 'research' | 'scheduling' | 'workflow_automation' | 'custom';
      config: AgentConfig;
    }
  ) {
    const [agent] = await db.insert(agents).values({
      userId,
      name: data.name,
      description: data.description,
      type: data.type,
      config: data.config,
      status: 'draft'
    }).returning();

    return agent;
  }

  async updateAgent(agentId: string, userId: string, updates: Partial<{
    name: string;
    description: string;
    config: AgentConfig;
    status: 'draft' | 'active' | 'paused' | 'archived';
  }>) {
    const [agent] = await db.update(agents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
      .returning();

    return agent;
  }

  async getAgentsByUser(userId: string) {
    return await db.select().from(agents).where(eq(agents.userId, userId));
  }

  async createWorkflow(
    agentId: string,
    data: {
      name: string;
      description?: string;
      definition: {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
      };
    }
  ) {
    const [workflow] = await db.insert(workflows).values({
      agentId,
      name: data.name,
      description: data.description,
      definition: data.definition,
      isActive: false
    }).returning();

    return workflow;
  }

  async executeAgent(agentId: string, input: any, workflowId?: string): Promise<any> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update monitoring metrics
      monitoringService.updateAgentMetrics(agentId, { status: 'processing' });

      // Create execution record
      const execution = await db.insert(agentExecutions).values({
        agentId,
        workflowId,
        input: JSON.stringify(input),
        status: 'running',
        startedAt: new Date(),
      }).returning();

      let result;
      const startTime = Date.now();

      try {
        if (workflowId) {
          // Execute workflow with advanced features
          result = await this.executeAdvancedWorkflow(agentId, workflowId, input, execution[0].id);
        } else {
          // Direct agent execution
          result = await this.processAgentInput(agent, input);
        }

        const responseTime = Date.now() - startTime;

        // Update execution record
        await db.update(agentExecutions)
          .set({
            status: 'completed',
            output: JSON.stringify(result),
            completedAt: new Date(),
          })
          .where(eq(agentExecutions.id, execution[0].id));

        // Update metrics
        monitoringService.updateAgentMetrics(agentId, {
          status: 'idle',
          averageResponseTime: responseTime,
          requestsPerMinute: (monitoringService.getAgentMetrics(agentId)?.requestsPerMinute || 0) + 1,
        });

        return result;
      } catch (error) {
        // Update metrics on error
        monitoringService.updateAgentMetrics(agentId, {
          status: 'error',
          errorRate: (monitoringService.getAgentMetrics(agentId)?.errorRate || 0) + 1,
        });

        await db.update(agentExecutions)
          .set({
            status: 'failed',
            output: JSON.stringify({ error: error.message }),
            completedAt: new Date(),
          })
          .where(eq(agentExecutions.id, execution[0].id));

        throw error;
      }
    } catch (error) {
      console.error('Agent execution error:', error);
      throw error;
    }
  }

  async getAgentExecutions(agentId: string, limit = 50) {
    return await db.select()
      .from(agentExecutions)
      .where(eq(agentExecutions.agentId, agentId))
      .limit(limit)
      .orderBy(agentExecutions.createdAt);
  }

  // --- New methods for advanced workflow execution ---

  private async getAgent(agentId: string): Promise<any> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
    return agent;
  }

  private async getWorkflow(workflowId: string): Promise<any> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
    return workflow;
  }

  private async processAgentInput(agent: any, input: any): Promise<any> {
    const startTime = Date.now();
    const executionId = null; // Not part of a workflow execution

    const aiResponse = await aiEngine.generateResponse(
      JSON.stringify(input),
      {
        model: agent.config.model,
        temperature: agent.config.temperature,
        maxTokens: agent.config.maxTokens,
        systemMessage: agent.config.systemPrompt
      }
    );

    const executionTime = Date.now() - startTime;

    // If not part of a workflow, we don't have an initial execution record to update here,
    // but the executeAgent method handles the main execution record creation and update.
    // This method focuses on the core AI processing.

    return { content: aiResponse.content };
  }

  private async executeAdvancedWorkflow(agentId: string, workflowId: string, input: any, executionId: string): Promise<any> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const definition = workflow.definition as any;
    const context = {
      agentId,
      executionId,
      variables: {},
      stepResults: [],
    };

    // Execute workflow steps sequentially or in parallel based on definition
    const result = await this.processWorkflowSteps(definition.steps, context, input);

    // Store workflow execution record
    await db.insert(workflowExecutions).values({
      agentId,
      workflowId,
      input: JSON.stringify(input),
      output: JSON.stringify(result),
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return result;
  }

  private async processWorkflowSteps(steps: any[], context: any, input: any): Promise<any> {
    let currentInput = input;

    for (const step of steps) {
      const stepResult = await this.executeWorkflowStep(step, context, currentInput);
      context.stepResults.push(stepResult);

      // Use step result as input for next step if configured
      if (step.passOutput) {
        currentInput = stepResult;
      }

      // Handle conditional steps
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        continue;
      }

      // Handle loops
      if (step.loop) {
        currentInput = await this.executeLoop(step, context, currentInput);
      }
    }

    return context.stepResults;
  }

  private async executeWorkflowStep(step: any, context: any, input: any): Promise<any> {
    switch (step.type) {
      case 'ai_generate':
        return await this.executeAIStep(step, context, input);
      case 'tool_call':
        return await this.executeToolStep(step, context, input);
      case 'condition':
        return this.evaluateCondition(step.condition, context);
      case 'data_transform':
        return this.transformData(input, step.transformation);
      case 'external_api':
        return await this.callExternalAPI(step.config, input);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    try {
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch {
      return false;
    }
  }

  private transformData(data: any, transformation: any): any {
    // Apply data transformations based on configuration
    return data; // Placeholder
  }

  private async callExternalAPI(config: any, data: any): Promise<any> {
    // Make external API calls
    return { success: true }; // Placeholder
  }

  private async executeLoop(step: any, context: any, input: any): Promise<any> {
    const results = [];
    const iterations = step.loop.iterations || 1;

    for (let i = 0; i < iterations; i++) {
      context.variables.loopIndex = i;
      const result = await this.processWorkflowSteps(step.loop.steps, context, input);
      results.push(result);
    }

    return results;
  }

  private async executeAIStep(step: any, context: any, input: any): Promise<any> {
    const agent = await this.getAgent(context.agentId);
    if (!agent) throw new Error('Agent not found for AI step');

    return await this.processAgentInput(agent, input);
  }

  private async executeToolStep(step: any, context: any, input: any): Promise<any> {
    // Placeholder for tool execution logic
    console.log(`Executing tool: ${step.toolName} with input:`, input);
    return { toolResult: `Tool ${step.toolName} executed successfully.` };
  }
}

export const agentService = new AgentService();