# Production deploy checklist

The merged code is on GitHub `main`, but **https://1-800ads.com still serves a Framer site**.  
Stripe, Notion, and checkout only work after you deploy this Astro app and point the domain at it.

## 1. Deploy on Railway (recommended)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select **`imjohnluke/1-800-ads`** and branch **`main`**
3. Railway will detect `railway.toml` and run `npm run build` + `npm start`
4. Open the service → **Variables** → add every variable below
5. **Settings → Networking** → generate a domain (e.g. `1-800-ads-production.up.railway.app`) to test before DNS cutover

## 2. Required environment variables

Copy these into Railway **Variables** (same names, your real values):

| Variable | Example / notes |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://1-800ads.com` (use your Railway URL until DNS is switched) |
| `STRIPE_SECRET_KEY` | `sk_live_...` from [Stripe → API keys](https://dashboard.stripe.com/apikeys) |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `NOTION_API_KEY` | From [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| `NOTION_BRIEF_DATABASE_ID` | `25a1140ed7768096bd04de5750073f0f` (Order Tracker board) |
| `NOTION_ORDERS_DATABASE_ID` | Same as above unless you split boards later |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook for `checkout.session.completed` |

**Do not commit these to git.** They live only in Railway (and your local `.env`).

After adding variables, click **Redeploy** so the running app picks them up.

## 3. Notion databases

**Briefs** — share with your integration and use columns: **Brand**, **Brand URL**, **Ad Styles**, **Promotions**, **Stripe Session**, **Uploads**, **Submitted**

**Orders** (Order Tracker board — `25a1140ed7768096bd04de5750073f0f`) — share with your integration. Existing columns used by the app:

- **Name** (Title), **Brand Link** (URL), **Pack Type** (Select), **Status** (Select)
- **Due Date** (Date), **Delivery Link** (URL), **Client** (Select)

Also add these two columns for checkout lookup (if not already present):

- **Customer Email** (Email)
- **Stripe Session** (Text)

## 4. Stripe webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://YOUR-RAILWAY-URL/api/stripe-webhook/` (then production domain after DNS)
3. Event: `checkout.session.completed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in Railway

## 5. Point 1-800ads.com at Railway

When the Railway URL works (homepage, `/brief/`, test checkout):

1. Railway service → **Settings → Networking → Custom Domain** → add `1-800ads.com` and `www.1-800ads.com`
2. At your domain registrar, update DNS to Railway’s CNAME targets
3. Set `PUBLIC_SITE_URL=https://1-800ads.com` in Railway variables and redeploy

This replaces the Framer site on that domain.

## 6. Smoke test

- [ ] Homepage loads on Railway URL
- [ ] `/brief/` loads
- [ ] Pricing → checkout opens (Stripe)
- [ ] `/track/` loads
- [ ] Submit a test brief → new row in Notion briefs DB
- [ ] Test checkout → new row in Notion orders DB (via webhook)
- [ ] Move order status in Notion → visible on `/track/`

## Local dev (same variables)

```bash
cp .env.example .env
# paste your keys into .env
npm install
npm run dev
```

Restart `npm run dev` after changing `.env`.
