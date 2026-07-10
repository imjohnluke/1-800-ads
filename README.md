# 1-800 Ads

Standalone marketing site and checkout for 1-800 Ads — static ad creatives on demand.

Rebuilt from the CreativeOS website as an independent Astro app (not an iframe or redirect).

## Stack

- [Astro](https://astro.build) 5
- React (Stripe embedded checkout)
- Node adapter (Railway / similar)

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Environment

| Variable | Description |
| --- | --- |
| `PUBLIC_SITE_URL` | Canonical site URL (e.g. `https://1-800ads.com`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Stripe products

Checkout uses fixed Stripe Products/Prices (one per tier: 5, 10, 20, 50, 100 ads). To create or refresh them in your Stripe account:

```bash
npm run stripe:setup
```

This writes `src/data/stripe-price-ids.ts` with the price IDs. Re-run after changing tier prices in `src/data/1800-ads-pricing.ts` (you may need new prices in Stripe since amounts are immutable on existing prices).

## Creative brief → Notion

Submitted briefs save to a Notion database. Setup:

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and copy the **Internal Integration Secret** → `NOTION_API_KEY`
2. Create a full-page database in Notion with these columns (names must match exactly):
   - **Brand** — Title
   - **Brand URL** — URL
   - **Ad Styles** — Text
   - **Promotions** — Text
   - **Stripe Session** — Text
   - **Uploads** — Text
   - **Submitted** — Date
3. Share the database with your integration (⋯ → Connect to → your integration)
4. Copy the database ID from the URL (`notion.so/.../{DATABASE_ID}?v=...`) → `NOTION_BRIEF_DATABASE_ID`

Uploads store filenames and sizes in **Uploads** for now. Notion needs public file URLs for attachments, so actual file storage (S3, Uploadthing, etc.) can be added later if needed.

## Customer portal

Customers access their dashboard at `/track/` (sign-in) and `/dashboard/` (authenticated).

1. **Access with email** — enter the checkout email; we match it to Notion orders and open the dashboard.
2. **Create account** — on first visit, set a password to sign in next time (stored in `data/customers.json` locally; set `CUSTOMER_DATA_PATH` on Railway for persistence).
3. **Sign in** — returning customers use email + password.

Env: `SESSION_SECRET` (required in production). Optional: `CUSTOMER_DATA_PATH`.

Post-checkout links with `?session_id=` auto-verify via Stripe and land customers in the dashboard.

## Order tracking → Notion

Order status syncs from your Notion orders board — when you move a card, customers see the new status on `/dashboard/`.

1. Create a second Notion database (**Orders**) with these columns (names must match exactly):
   - **Brand** — Title
   - **Customer Email** — Email
   - **Stripe Session** — Text
   - **Ad Count** — Number
   - **Total** — Number
   - **Delivery** — Select (`One-time`, `Monthly`)
   - **Status** — Select (`Paid`, `Brief Pending`, `Brief Received`, `In Production`, `In Review`, `Delivered`)
   - **Brand URL** — URL
   - **Paid At** — Date
2. Share it with your integration → `NOTION_ORDERS_DATABASE_ID`
3. In [Stripe → Webhooks](https://dashboard.stripe.com/webhooks), add endpoint `https://your-domain.com/api/stripe-webhook/` for `checkout.session.completed` → `STRIPE_WEBHOOK_SECRET`

Use a Kanban view grouped by **Status** as your ops board. Dragging cards updates what customers see on `/track/`.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for the full production checklist (Railway, env vars, DNS).

Quick version:

```bash
npm run build
npm start
```

Set these in your host’s environment panel (Railway → **Variables**):

- `PUBLIC_SITE_URL`
- `STRIPE_SECRET_KEY`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NOTION_API_KEY`
- `NOTION_BRIEF_DATABASE_ID`
- `NOTION_ORDERS_DATABASE_ID`
- `STRIPE_WEBHOOK_SECRET`

## Branding

- **Headlines:** Advercase (`public/fonts/AdvercaseFont-Regular.otf`)
- **Body text:** Inter (loaded from Google Fonts)


- `/` — Landing page with pricing slider and Stripe checkout
- `/brief/` — Post-checkout creative brief
- `/track/` — Customer portal sign-in
- `/dashboard/` — Authenticated customer dashboard (synced with Notion)
- `/order-success/` — Post-checkout confirmation
