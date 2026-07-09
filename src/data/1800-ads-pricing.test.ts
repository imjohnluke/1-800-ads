import { describe, expect, it } from 'vitest'
import {
  ADS_MIN,
  ADS_MAX,
  clampAdCount,
  getOrderSummary,
  getPricePerAd,
  getTotalPrice,
  qualifiesForRecurringDelivery,
} from './1800-ads-pricing'

describe('1800-ads-pricing', () => {
  it('clamps ad counts to 5-50', () => {
    expect(clampAdCount(1)).toBe(ADS_MIN)
    expect(clampAdCount(100)).toBe(ADS_MAX)
    expect(clampAdCount(12.6)).toBe(13)
  })

  it('decreases per-ad price as quantity increases', () => {
    expect(getPricePerAd(ADS_MIN)).toBeGreaterThan(getPricePerAd(ADS_MAX))
  })

  it('starts at $80 per ad for the minimum order', () => {
    expect(getPricePerAd(ADS_MIN)).toBe(80)
    expect(getTotalPrice(ADS_MIN)).toBe(400)
  })

  it('returns consistent order totals', () => {
    const order = getOrderSummary(20)
    expect(order.adCount).toBe(20)
    expect(order.total).toBe(getTotalPrice(20))
    expect(order.savings).toBeGreaterThan(0)
  })

  it('qualifies for recurring delivery at 20+ ads', () => {
    expect(qualifiesForRecurringDelivery(19)).toBe(false)
    expect(qualifiesForRecurringDelivery(20)).toBe(true)
    expect(qualifiesForRecurringDelivery(50)).toBe(true)
  })
})
