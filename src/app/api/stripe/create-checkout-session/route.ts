import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** POST /api/stripe/create-checkout-session — create Stripe Checkout for subscription (tier). */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { tierId } = body as { tierId?: string }
    const tier = ['starter', 'pro', 'team'].includes(tierId) ? tierId : 'starter'
    const tierConfig = { starter: process.env.STRIPE_PRICE_ID_STARTER, pro: process.env.STRIPE_PRICE_ID_PRO, team: process.env.STRIPE_PRICE_ID_TEAM }[tier]
    const priceId = tierConfig || process.env.STRIPE_PRICE_ID_STARTER
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for tier' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) }) as { email?: string; stripeCustomerId?: string } | null
    const email = session.user.email || user?.email
    if (!email) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 })
    }

    let customerId = user?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id
      await db.collection('users').updateOne(
        { _id: new ObjectId(session.user.id) },
        { $set: { stripeCustomerId: customerId, updatedAt: new Date() } }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/dashboard?subscription=cancel`,
      metadata: { userId: session.user.id, tier },
      subscription_data: { metadata: { userId: session.user.id, tier } },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (e) {
    console.error('Stripe checkout error:', e)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
