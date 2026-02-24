# Support email setup (Resend)

When a user submits a support ticket at **/support**, the app:

1. Saves the ticket in MongoDB (`support_tickets`).
2. If Resend is configured, sends an email to **you** (support email) with the ticket details.
3. Optionally sends a confirmation email to the **submitter**.

## Variables to set

In **.env.local** (local) or **Vercel → Environment Variables** (production):

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for email) | Your Resend API key from [resend.com](https://resend.com). Create an account, then API Keys. |
| `SUPPORT_EMAIL` | Yes (for email) | Email that receives new ticket notifications (e.g. `cameronmdeans@gmail.com`). |
| `FROM_EMAIL` | No | “From” address. Default: `onboarding@resend.dev` (Resend’s test sender). For production, use a verified domain (e.g. `support@yourdomain.com`). |

If `RESEND_API_KEY` or `SUPPORT_EMAIL` is not set, tickets are still created and stored; only the email step is skipped.

## Resend setup

1. Sign up at [resend.com](https://resend.com).
2. In the dashboard, create an **API Key** and copy it into `RESEND_API_KEY`.
3. **Testing:** You can use `FROM_EMAIL=onboarding@resend.dev` and send to your own email (`SUPPORT_EMAIL=cameronmdeans@gmail.com`). Resend allows this for development.
4. **Production (after you have a domain):** In Resend, add and verify your domain. Then set `FROM_EMAIL=support@yourdomain.com` (or any address on that domain). Update `SUPPORT_EMAIL` if you want notifications to go to a different address.

## Flow

- **New ticket** → Email to `SUPPORT_EMAIL` with subject `[G.R.I.P. Support] <user's subject>`, body: from, email, domain, ticket ID, message.
- **Confirmation** → Email to the submitter’s address: “We received your support request: …”.

You can change or disable the confirmation in `src/lib/email/resendSupport.ts` and `src/app/api/support/tickets/route.ts`.
