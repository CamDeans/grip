import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { sendSupportTicketNotification, sendSupportTicketConfirmation } from '@/lib/email/resendSupport'

export interface SupportTicketBody {
  name: string
  email: string
  subject: string
  message: string
  domain?: string
}

/** POST /api/support/tickets - Create a support ticket (public). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupportTicketBody
    const { name, email, subject, message, domain } = body

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const doc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      domain: domain?.trim() || null,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('support_tickets').insertOne(doc)
    const ticketId = result.insertedId.toString()

    await sendSupportTicketNotification({
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
      domain: doc.domain,
      ticketId,
    })
    await sendSupportTicketConfirmation(doc.email, doc.subject, ticketId).catch(() => {})

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Support ticket created. We will get back to you soon.',
    })
  } catch (error) {
    console.error('Support ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

/** GET /api/support/tickets - List support tickets (admin-only). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db()

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

    const filter = status ? { status } : {}
    const tickets = await db
      .collection('support_tickets')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ name: 1, email: 1, subject: 1, message: 1, domain: 1, status: 1, createdAt: 1 })
      .toArray()

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}
