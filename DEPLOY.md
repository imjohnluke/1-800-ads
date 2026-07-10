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
| `NOTION_BRIEF_DATABASE_ID` | `25a1140ed7768096bd04de5750073f0f` |

**Do not commit these to git.** They live only in Railway (and your local `.env`).

After adding variables, click **Redeploy** so the running app picks them up.

## 3. Notion database

Your Notion database must:

- Be **shared with your integration** (⋯ → Connections → your integration)
- Have columns named exactly: **Brand**, **Brand URL**, **Ad Styles**, **Promotions**, **Stripe Session**, **Uploads**, **Submitted**

## 4. Point 1-800ads.com at Railway

When the Railway URL works (homepage, `/brief/`, test checkout):

1. Railway service → **Settings → Networking → Custom Domain** → add `1-800ads.com` and `www.1-800ads.com`
2. At your domain registrar, update DNS to Railway’s CNAME targets
3. Set `PUBLIC_SITE_URL=https://1-800ads.com` in Railway variables and redeploy

This replaces the Framer site on that domain.

## 5. Smoke test

- [ ] Homepage loads on Railway URL
- [ ] `/brief/` loads
- [ ] Pricing → checkout opens (Stripe)
- [ ] Submit a test brief → new row in Notion

## Local dev (same variables)

```bash
cp .env.example .env
# paste your keys into .env
npm install
npm run dev
```

Restart `npm run dev` after changing `.env`.
