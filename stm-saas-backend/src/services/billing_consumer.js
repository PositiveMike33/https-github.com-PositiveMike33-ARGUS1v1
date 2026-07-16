import amqp from 'amqplib';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
let rabbitChannel = null;

export const initRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue('billing_events', { durable: true });
    console.log('🐰 [RABBITMQ] Worker de facturation Stripe (Metered) connecté');
    
    rabbitChannel.consume('billing_events', async (msg) => {
      if (msg !== null) {
        const payload = JSON.parse(msg.content.toString());
        await processStripeBilling(payload);
        rabbitChannel.ack(msg); // Confirme la facturation
      }
    });
  } catch (error) {
    console.error('❌ [RABBITMQ] Erreur:', error.message);
  }
};

export const publishBillingEvent = (userId, tokens, provider) => {
  if (!rabbitChannel) return;
  const event = { userId, tokens, provider, timestamp: new Date().toISOString() };
  rabbitChannel.sendToQueue('billing_events', Buffer.from(JSON.stringify(event)));
};

const processStripeBilling = async ({ userId, tokens, provider }) => {
  const totalTokens = tokens.input + tokens.output;
  const billedUnits = Math.ceil(totalTokens / 1000); 

  // ARBITRAGE : On facture au tarif cloud même si le provider est "ollama_argus"
  console.log(`💰 [BILLING] User: ${userId} | Source: ${provider} | Facturé: ${billedUnits}k unités`);

  try {
    /* // DÉCOMMENTER POUR LA PRODUCTION STRIPE
    await stripe.subscriptionItems.createUsageRecord('si_USER_STRIPE_SUB_ITEM_ID', {
      quantity: totalTokens,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });
    */
  } catch (err) {
    console.error('❌ Echec de notification Stripe:', err.message);
  }
};
