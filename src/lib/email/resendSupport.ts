import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || ''

export interface SupportTicketEmailPayload {
  name: string
  email: string
  subject: string
  message: string
  domain?: string | null
  ticketId: string
}

/**
 * Send a support ticket notification to the support email (admin).
 * Only sends if RESEND_API_KEY and SUPPORT_EMAIL are set.
 */
export async function sendSupportTicketNotification(payload: SupportTicketEmailPayload): Promise<boolean> {
  if (!resend || !SUPPORT_EMAIL) return false

  try {
    const { name, email, subject, message, domain, ticketId } = payload
    const body = [
      `New support ticket: ${subject}`,
      ``,
      `From: ${name} <${email}>`,
      domain ? `Domain: ${domain}` : null,
      `Ticket ID: ${ticketId}`,
      ``,
      `Message:`,
      message,
    ]
      .filter(Boolean)
      .join('\n')

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      subject: `[G.R.I.P. Support] ${subject}`,
      text: body,
    })

    if (error) {
      console.error('Resend support notification error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend send error:', err)
    return false
  }
}

/**
 * Send a confirmation email to the ticket submitter (optional).
 */
export async function sendSupportTicketConfirmation(
  to: string,
  subject: string,
  ticketId: string
): Promise<boolean> {
  if (!resend || !SUPPORT_EMAIL) return false

  try {
    const text = `We received your support request: "${subject}" (Ticket #${ticketId}). We'll get back to you at this email address.`

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[G.R.I.P.] We received your support request`,
      text,
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend send error:', err)
    return false
  }
}
