import Bull from 'bull';

export interface AgentJob {
  agentId: string;
  type: 'execute_workflow' | 'send_message' | 'process_data';
  data: any;
  priority?: number;
}

export class QueueService {
  private agentQueue: Bull.Queue;

  constructor() {
    // Use Redis if available, otherwise use local memory
    const redisUrl = process.env.REDIS_URL;
    this.agentQueue = new Bull('agent-jobs', redisUrl || undefined);

    this.setupProcessors();
  }

  private setupProcessors() {
    this.agentQueue.process('execute_workflow', this.processWorkflow.bind(this));
    this.agentQueue.process('send_message', this.processSendMessage.bind(this));
    this.agentQueue.process('process_data', this.processData.bind(this));
  }

  async addJob(job: AgentJob): Promise<Bull.Job> {
    return await this.agentQueue.add(job.type, job, {
      priority: job.priority || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  private async processWorkflow(job: Bull.Job<AgentJob>) {
    console.log('Processing workflow job:', job.data);
    // Implement workflow execution logic
    await this.simulateWork(1000);
    return { success: true, result: 'Workflow completed' };
  }

  private async processSendMessage(job: Bull.Job<AgentJob>) {
    console.log('Processing send message job:', job.data);
    // Implement message sending logic
    await this.simulateWork(500);
    return { success: true, result: 'Message sent' };
  }

  private async processData(job: Bull.Job<AgentJob>) {
    console.log('Processing data job:', job.data);
    // Implement data processing logic
    await this.simulateWork(2000);
    return { success: true, result: 'Data processed' };
  }

  private simulateWork(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async getQueueStats() {
    const waiting = await this.agentQueue.getWaiting();
    const active = await this.agentQueue.getActive();
    const completed = await this.agentQueue.getCompleted();
    const failed = await this.agentQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  async processJobs(): Promise<void> {
    // Process jobs from queue
    console.log('Processing jobs from queue');
  }
}

export const queueService = new QueueService();