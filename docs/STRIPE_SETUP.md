# Stripe setup for GRIP (plain English)

Steps to connect Stripe so users can subscribe and get token access. Do these in order.

---

## 1. Create a Stripe account (if you do not have one)

- Go to stripe.com and sign up.
- Complete account verification so you can accept live payments (or use Test mode first).

---

## 2. Get your API keys

- Log in to the Stripe Dashboard.
- Click **Developers** in the left sidebar, then **API keys**.
- You will see:
  - **Publishable key** (starts with pk_live_ or pk_test_). This is safe to use in the browser.
  - **Secret key** (starts with sk_live_ or sk_test_). Never put this in the browser or in git.
- Copy the **Secret key**. You will add it to your app as STRIPE_SECRET_KEY.
- Copy the **Publishable key** if you ever need it on the front end (e.g. for a “Pay” button that talks to Stripe). For Checkout, the app uses the secret key on the server only, so the publishable key is optional for the current flow.

---

## 3. Create three products (or one product with three prices)

GRIP has three plans: Starter, Pro, Team. In Stripe you can either create three separate products or one product with three recurring prices. The app only needs the **Price IDs** for each plan.

### Option A: One product with three prices (simplest)

- Go to **Product catalog** in the Stripe Dashboard, then **Products**.
- Click **Add product**.
- **Product name:** e.g. `GRIP Subscription`.
- **Description:** e.g. `Monthly subscription for GRIP. Includes token allowance for chat, code generation, and builds.`
- Do **not** add a price yet. Click **Save product**.
- Open the product you just created. Click **Add another price**.
  - **Price 1:**  
    - **Pricing model:** Recurring.  
    - **Price:** $19.00 USD.  
    - **Billing period:** Monthly.  
    - **Price description (optional):** `Starter – 50,000 tokens/month`  
    - Save. **Copy the Price ID** (starts with price_). This is your **Starter** price ID.
  - **Price 2:**  
    - Add another price: $49.00 USD, Monthly.  
    - Description (optional): `Pro – 200,000 tokens/month`  
    - Save. **Copy the Price ID.** This is your **Pro** price ID.
  - **Price 3:**  
    - Add another price: $99.00 USD, Monthly.  
    - Description (optional): `Team – 500,000 tokens/month`  
    - Save. **Copy the Price ID.** This is your **Team** price ID.

### Option B: Three separate products

- Create three products, e.g.:
  - **GRIP Starter** – one recurring price $19/month.
  - **GRIP Pro** – one recurring price $49/month.
  - **GRIP Team** – one recurring price $99/month.
- For each product, create one **recurring monthly** price and copy its **Price ID**.

Product names and descriptions are for your and the customer’s clarity. The app only uses the **Price IDs** and the **amount** (which is already correct if you set $19, $49, $99).

---

## 4. Add environment variables to your app

In your project, open `.env.local` (or your production env) and set:

- **STRIPE_SECRET_KEY**  
  Paste the Stripe **Secret key** from step 2 (sk_live_... or sk_test_...).

- **STRIPE_PRICE_ID_STARTER**  
  Paste the Price ID for the **$19/month** plan (e.g. price_xxxxx).

- **STRIPE_PRICE_ID_PRO**  
  Paste the Price ID for the **$49/month** plan.

- **STRIPE_PRICE_ID_TEAM**  
  Paste the Price ID for the **$99/month** plan.

Optional (for future client-side Stripe use):

- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**  
  Paste the **Publishable key** (pk_live_... or pk_test_...).

Do not commit these values to git. Keep `.env.local` in `.gitignore`. On your host (e.g. Vercel), add the same variable names and values in the project’s environment settings.

---

## 5. Set up the webhook (required for access and token reset)

The app uses a webhook to grant access and reset token usage when a subscription is created or renewed. Without the webhook, paid users will not get access or token resets.

- In Stripe Dashboard go to **Developers** → **Webhooks**.
- Click **Add endpoint**.
- **Endpoint URL:**  
  Your app’s base URL + `/api/stripe/webhook`  
  Examples:  
  - Local: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`  
  - Production: `https://yourdomain.com/api/stripe/webhook`
- **Events to send:** Click **Select events** and add:
  - **checkout.session.completed**
  - **customer.subscription.updated**
  - **customer.subscription.deleted**
  - **invoice.paid**
- Click **Add endpoint**.
- Open the new endpoint and click **Reveal** under **Signing secret**.
- Copy the value (starts with whsec_).
- Add it to your app as **STRIPE_WEBHOOK_SECRET** in `.env.local` and in your host’s environment variables.

Important: Use **HTTPS** for the webhook URL in production. For local testing you need a public URL (e.g. ngrok) so Stripe can reach your machine.

---

## 6. Make sure your app URL is correct

The checkout success and cancel URLs are built from **NEXTAUTH_URL** (or the request origin). Set **NEXTAUTH_URL** in production to your real site URL (e.g. `https://yourdomain.com`) so after payment users are sent back to your app and land on the dashboard with the correct session.

---

## 7. Test before going live

- Use **Test mode** in Stripe (toggle in the Dashboard). Use test keys (sk_test_, pk_test_) and test Price IDs.
- In your app, go to the plans page and click Subscribe on a tier. Complete Checkout with Stripe’s test card (e.g. 4242 4242 4242 4242).
- After payment, confirm:
  - You are redirected to the dashboard with a success state.
  - The user has access and the correct token allowance (50,000 for Starter, 200,000 for Pro, 500,000 for Team).
- In Stripe Dashboard → **Developers** → **Webhooks**, open your endpoint and check that **checkout.session.completed** and **invoice.paid** (on renewal) show as delivered. If they fail, fix the URL or signing secret.

---

## 8. Go live

- When ready, switch Stripe to **Live mode**.
- Create the same three prices (or products) in **Live** and copy the **live** Price IDs.
- Create a **live** webhook endpoint pointing to your production URL `/api/stripe/webhook`.
- Replace your env vars with **live** values:
  - STRIPE_SECRET_KEY (sk_live_...)
  - STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_TEAM (live price IDs)
  - STRIPE_WEBHOOK_SECRET (whsec_... for the live endpoint)
- Redeploy the app so it uses the new env. Test one real subscription and one renewal (or use a real card and then cancel) to confirm access and token reset.

---

## Summary checklist

- [ ] Stripe account created and verified (or Test mode).
- [ ] Three recurring monthly prices: $19, $49, $99 (or three products with one price each).
- [ ] Price IDs copied and set as STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_TEAM.
- [ ] STRIPE_SECRET_KEY set in env.
- [ ] Webhook added with URL …/api/stripe/webhook and events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid.
- [ ] STRIPE_WEBHOOK_SECRET set in env.
- [ ] NEXTAUTH_URL set to your real app URL in production.
- [ ] Tested in Test mode; then switched to Live and updated all keys and IDs for production.
