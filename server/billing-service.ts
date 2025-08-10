
export interface UsageRecord {
  id: string;
  userId: string;
  agentId: string;
  model: string;
  tokensUsed: number;
  computeTime: number; // milliseconds
  cost: number;
  timestamp: string;
  requestType: 'chat' | 'function_call' | 'embedding' | 'fine_tune';
}

export interface UserPlan {
  id: string;
  name: string;
  type: 'free' | 'pro' | 'enterprise';
  limits: {
    monthlyTokens: number;
    maxAgents: number;
    maxIntegrations: number;
    maxWorkflows: number;
    supportedModels: string[];
    features: string[];
  };
  pricing: {
    monthlyFee: number;
    tokenOverageCost: number; // per 1K tokens
    computeOverageCost: number; // per second
  };
}

export interface UserSubscription {
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  usage: {
    tokensUsed: number;
    computeTime: number;
    agentsCreated: number;
    integrationsUsed: number;
  };
  billing: {
    totalCost: number;
    baseFee: number;
    overageCost: number;
  };
}

export class BillingService {
  private plans: Map<string, UserPlan> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private usageRecords: UsageRecord[] = [];

  constructor() {
    this.initializePlans();
  }

  private initializePlans() {
    const plans: UserPlan[] = [
      {
        id: 'free',
        name: 'Free Tier',
        type: 'free',
        limits: {
          monthlyTokens: 10000,
          maxAgents: 3,
          maxIntegrations: 2,
          maxWorkflows: 5,
          supportedModels: ['gpt-3.5-turbo', 'ollama:llama2'],
          features: ['basic-templates', 'community-support'],
        },
        pricing: {
          monthlyFee: 0,
          tokenOverageCost: 0.002,
          computeOverageCost: 0.01,
        },
      },
      {
        id: 'pro',
        name: 'Pro',
        type: 'pro',
        limits: {
          monthlyTokens: 100000,
          maxAgents: 25,
          maxIntegrations: 10,
          maxWorkflows: 50,
          supportedModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro', 'ollama:*'],
          features: ['advanced-templates', 'priority-support', 'analytics', 'custom-connectors'],
        },
        pricing: {
          monthlyFee: 29,
          tokenOverageCost: 0.0015,
          computeOverageCost: 0.008,
        },
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        type: 'enterprise',
        limits: {
          monthlyTokens: 1000000,
          maxAgents: -1, // unlimited
          maxIntegrations: -1,
          maxWorkflows: -1,
          supportedModels: ['*'],
          features: ['*'],
        },
        pricing: {
          monthlyFee: 199,
          tokenOverageCost: 0.001,
          computeOverageCost: 0.005,
        },
      },
    ];

    plans.forEach(plan => this.plans.set(plan.id, plan));
  }

  trackUsage(usage: Omit<UsageRecord, 'id' | 'timestamp'>): UsageRecord {
    const record: UsageRecord = {
      ...usage,
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.usageRecords.push(record);
    this.updateUserUsage(record);
    
    return record;
  }

  private updateUserUsage(record: UsageRecord) {
    const subscription = this.subscriptions.get(record.userId);
    if (subscription) {
      subscription.usage.tokensUsed += record.tokensUsed;
      subscription.usage.computeTime += record.computeTime;
      
      // Calculate costs
      this.calculateBilling(subscription);
    }
  }

  private calculateBilling(subscription: UserSubscription) {
    const plan = this.plans.get(subscription.planId);
    if (!plan) return;

    subscription.billing.baseFee = plan.pricing.monthlyFee;
    
    // Calculate overage costs
    const tokenOverage = Math.max(0, subscription.usage.tokensUsed - plan.limits.monthlyTokens);
    const tokenOverageCost = (tokenOverage / 1000) * plan.pricing.tokenOverageCost;
    
    const computeOverageSeconds = subscription.usage.computeTime / 1000;
    const computeOverageCost = computeOverageSeconds * plan.pricing.computeOverageCost;
    
    subscription.billing.overageCost = tokenOverageCost + computeOverageCost;
    subscription.billing.totalCost = subscription.billing.baseFee + subscription.billing.overageCost;
  }

  createSubscription(userId: string, planId: string): UserSubscription {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Plan not found');

    const subscription: UserSubscription = {
      userId,
      planId,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usage: {
        tokensUsed: 0,
        computeTime: 0,
        agentsCreated: 0,
        integrationsUsed: 0,
      },
      billing: {
        totalCost: plan.pricing.monthlyFee,
        baseFee: plan.pricing.monthlyFee,
        overageCost: 0,
      },
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  getUserSubscription(userId: string): UserSubscription | null {
    return this.subscriptions.get(userId) || null;
  }

  getUserUsage(userId: string, startDate?: string, endDate?: string): UsageRecord[] {
    let records = this.usageRecords.filter(r => r.userId === userId);
    
    if (startDate) {
      records = records.filter(r => r.timestamp >= startDate);
    }
    
    if (endDate) {
      records = records.filter(r => r.timestamp <= endDate);
    }
    
    return records;
  }

  checkLimits(userId: string, operation: 'create_agent' | 'use_integration' | 'create_workflow'): boolean {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) return false;

    const plan = this.plans.get(subscription.planId);
    if (!plan) return false;

    switch (operation) {
      case 'create_agent':
        return plan.limits.maxAgents === -1 || subscription.usage.agentsCreated < plan.limits.maxAgents;
      case 'use_integration':
        return plan.limits.maxIntegrations === -1 || subscription.usage.integrationsUsed < plan.limits.maxIntegrations;
      case 'create_workflow':
        return true; // Check against workflow count (would need separate tracking)
      default:
        return false;
    }
  }

  canUseModel(userId: string, model: string): boolean {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) return false;

    const plan = this.plans.get(subscription.planId);
    if (!plan) return false;

    if (plan.limits.supportedModels.includes('*')) return true;
    
    return plan.limits.supportedModels.some(supportedModel => {
      if (supportedModel.endsWith('*')) {
        return model.startsWith(supportedModel.slice(0, -1));
      }
      return model === supportedModel;
    });
  }

  generateUsageReport(userId: string): any {
    const subscription = this.getUserSubscription(userId);
    const usage = this.getUserUsage(userId);
    const plan = this.plans.get(subscription?.planId || 'free');

    return {
      period: subscription ? {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      } : null,
      plan: plan?.name,
      usage: subscription?.usage,
      billing: subscription?.billing,
      detailedUsage: usage.reduce((acc: any, record) => {
        const date = record.timestamp.split('T')[0];
        if (!acc[date]) {
          acc[date] = { tokens: 0, computeTime: 0, requests: 0, cost: 0 };
        }
        acc[date].tokens += record.tokensUsed;
        acc[date].computeTime += record.computeTime;
        acc[date].requests += 1;
        acc[date].cost += record.cost;
        return acc;
      }, {}),
      limits: plan?.limits,
      recommendations: this.getUsageRecommendations(userId),
    };
  }

  private getUsageRecommendations(userId: string): string[] {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) return [];

    const plan = this.plans.get(subscription.planId);
    if (!plan) return [];

    const recommendations: string[] = [];
    const tokenUsageRatio = subscription.usage.tokensUsed / plan.limits.monthlyTokens;

    if (tokenUsageRatio > 0.8) {
      recommendations.push('Consider upgrading your plan to avoid overage charges');
    }

    if (subscription.billing.overageCost > subscription.billing.baseFee * 0.5) {
      recommendations.push('Your overage costs are high. A higher tier plan might be more cost-effective');
    }

    if (subscription.usage.agentsCreated >= plan.limits.maxAgents * 0.9) {
      recommendations.push('You\'re approaching your agent limit. Consider upgrading to create more agents');
    }

    return recommendations;
  }

  getAllPlans(): UserPlan[] {
    return Array.from(this.plans.values());
  }

  resetUsage(userId: string) {
    const subscription = this.subscriptions.get(userId);
    if (subscription) {
      subscription.usage = {
        tokensUsed: 0,
        computeTime: 0,
        agentsCreated: subscription.usage.agentsCreated, // Keep this
        integrationsUsed: 0,
      };
      subscription.billing.overageCost = 0;
      subscription.billing.totalCost = subscription.billing.baseFee;
    }
  }
}

export const billingService = new BillingService();
