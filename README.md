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

## Deploy

```bash
npm run build
npm start
```

Set the same environment variables in your hosting provider.

## Pages

- `/` — Landing page with pricing slider and Stripe checkout
- `/order-success/` — Post-checkout confirmation
