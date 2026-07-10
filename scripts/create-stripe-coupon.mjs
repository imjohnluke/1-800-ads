/**
 * Creates a 100% off Stripe coupon + promotion code for internal/testing checkout.
 * Run: node --env-file=.env scripts/create-stripe-coupon.mjs
 */
import Stripe from 'stripe'

const PROMO_CODE = '1ADSFREE'
const COUPON_ID = '1800ads-100-off'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Run with: node --env-file=.env scripts/create-stripe-coupon.mjs')
  process.exit(1)
}

const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })

async function ensureCoupon() {
  try {
    const existing = await stripe.coupons.retrieve(COUPON_ID)
    console.log(`Found coupon ${existing.id} (${existing.percent_off}% off)`)
    return existing
  } catch (err) {
    if (err?.code !== 'resource_missing') throw err
  }

  const coupon = await stripe.coupons.create({
    id: COUPON_ID,
    name: '1-800 Ads — 100% off (internal)',
    percent_off: 100,
    duration: 'once',
    metadata: { product: '1800-ads', purpose: 'internal-testing' },
  })

  console.log(`Created coupon ${coupon.id} (${coupon.percent_off}% off)`)
  return coupon
}

async function ensurePromotionCode(couponId) {
  const { data } = await stripe.promotionCodes.list({
    code: PROMO_CODE,
    active: true,
    limit: 1,
  })

  if (data[0]) {
    console.log(`Found promotion code ${data[0].code} (${data[0].id})`)
    return data[0]
  }

  const promo = await stripe.promotionCodes.create({
    coupon: couponId,
    code: PROMO_CODE,
    metadata: { product: '1800-ads', purpose: 'internal-testing' },
  })

  console.log(`Created promotion code ${promo.code} (${promo.id})`)
  return promo
}

async function main() {
  const coupon = await ensureCoupon()
  const promo = await ensurePromotionCode(coupon.id)

  console.log('\nUse at checkout:')
  console.log(`  ?coupon=${promo.code}`)
  console.log(`  Example: http://localhost:4321/?coupon=${promo.code}#order`)
  console.log(`\nCoupon ID (Stripe): ${coupon.id}`)
  console.log(`Promotion code ID: ${promo.id}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
