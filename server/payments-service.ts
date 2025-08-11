
import Stripe from 'stripe';
import { db } from './db';

// Initialize Stripe only if API key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key_here') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export class PaymentsService {
  async createPaymentIntent(bookingId: string, amount: number, clientEmail?: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'inr',
        receipt_email: clientEmail,
        metadata: { booking_id: bookingId }
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async handleWebhook(body: any, signature: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    try {
      const event = stripe.webhooks.constructEvent(
        body, 
        signature, 
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
      );

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.booking_id;
        
        if (bookingId) {
          // Update booking status to confirmed
          await db.update('bookings')
            .set({
              status: 'confirmed',
              priceCharged: paymentIntent.amount / 100,
              updatedAt: new Date().toISOString()
            })
            .where('id', bookingId);
          
          console.log('Payment succeeded for booking', bookingId);
        }
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Webhook verification failed');
    }
  }
}

export const paymentsService = new PaymentsService();
