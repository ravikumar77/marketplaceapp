
import { db } from './db';
import { nanoid } from 'nanoid';

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  features: Record<string, any>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'cancelled';
  autoRenew: boolean;
}

export class SubscriptionService {
  async initializePlans() {
    // Create default plans if they don't exist
    const existingPlans = await db.select().from('plans').limit(1);
    
    if (existingPlans.length === 0) {
      const freePlan: Plan = {
        id: nanoid(),
        name: 'Free',
        price: 0,
        billingCycle: 'monthly',
        features: { priority: false, offlinePayments: false }
      };

      const proPlan: Plan = {
        id: nanoid(),
        name: 'Pro',
        price: 499,
        billingCycle: 'monthly',
        features: { priority: true, offlinePayments: true }
      };

      await db.insert('plans').values([freePlan, proPlan]);
      console.log('Default subscription plans created');
    }
  }

  async createSubscription(userId: string, planId: string): Promise<Subscription> {
    const plans = await db.select().from('plans').where('id', planId);
    if (plans.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = plans[0];
    const subscriptionId = nanoid();
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription: Subscription = {
      id: subscriptionId,
      userId,
      planId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      autoRenew: true
    };

    await db.insert('subscriptions').values(subscription);
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const subscriptions = await db.select()
      .from('subscriptions')
      .where('userId', userId)
      .where('status', 'active')
      .orderBy('startDate', 'desc')
      .limit(1);

    return subscriptions[0] || null;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    return endDate > now;
  }

  async canUseOfflinePayments(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    const plans = await db.select().from('plans').where('id', subscription.planId);
    if (plans.length === 0) return false;

    const plan = plans[0];
    return plan.features?.offlinePayments === true;
  }
}

export const subscriptionService = new SubscriptionService();
