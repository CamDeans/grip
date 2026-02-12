import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, getTierByPriceId, type TierId } from '@/lib/stripe'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const subId = session.subscription as string
      const userId = session.metadata?.userId
      const tier = (session.metadata?.tier as TierId) || 'starter'
      if (!userId) return NextResponse.json({ ok: true })

      const subscription = await stripe.subscriptions.retrieve(subId)
      const priceId = subscription.items.data[0]?.price?.id
      const tierConfig = getTierByPriceId(priceId || '') || { id: tier, tokensPerMonth: 650_000 }
      const tokensPerMonth = tierConfig.tokensPerMonth ?? 650_000

      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            stripeSubscriptionId: subId,
            tier: tierConfig.id,
            tokenAllowance: tokensPerMonth,
            tokensUsedThisPeriod: 0,
            subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          },
        }
      )
      await db.collection('revenue_events').insertOne({
        type: 'subscription_started',
        userId: new ObjectId(userId),
        stripeSubscriptionId: subId,
        tier,
        amountCents: subscription.items.data[0]?.price?.unit_amount ?? 0,
        createdAt: new Date(),
      })
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      if (!userId) return NextResponse.json({ ok: true })
      if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          { $unset: { stripeSubscriptionId: 1, tier: 1, tokenAllowance: 1, subscriptionPeriodEnd: 1 }, $set: { updatedAt: new Date() } }
        )
      } else {
        const priceId = subscription.items.data[0]?.price?.id
        const tierConfig = getTierByPriceId(priceId || '')
        const tokensPerMonth = tierConfig?.tokensPerMonth ?? 650_000
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              tier: tierConfig?.id ?? 'starter',
              tokenAllowance: tokensPerMonth,
              subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
              updatedAt: new Date(),
            },
          }
        )
      }
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (!subId) return NextResponse.json({ ok: true })
      const subscription = await stripe.subscriptions.retrieve(subId)
      const userId = subscription.metadata?.userId
      if (!userId) return NextResponse.json({ ok: true })
      // On renewal, reset token usage for the new period (no rollover; allowance is per period only)
      const priceId = subscription.items.data[0]?.price?.id
      const tierConfig = getTierByPriceId(priceId || '')
      const tokensPerMonth = tierConfig?.tokensPerMonth ?? 650_000
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            tokensUsedThisPeriod: 0,
            tokenAllowance: tokensPerMonth,
            subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          },
        }
      )
      await db.collection('revenue_events').insertOne({
        type: 'invoice_paid',
        userId: new ObjectId(userId),
        stripeSubscriptionId: subId,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid ?? 0,
        createdAt: new Date(),
      })
    }
  } catch (e) {
    console.error('Webhook handler error:', e)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
