import { describe, expect, it } from 'vitest'
import {
  ADS_MIN,
  ADS_MAX,
  ADS_DEFAULT,
  ADS_OPTIONS,
  DELIVERY_SCHEDULES,
  clampAdCount,
  getOrderSummary,
  getPricePerAd,
  getTotalPrice,
  getAdCountFromIndex,
  getAdCountIndex,
  getDeliveryScheduleLabel,
} from './1800-ads-pricing'

describe('1800-ads-pricing', () => {
  it('snaps ad counts to the nearest tier', () => {
    expect(clampAdCount(1)).toBe(ADS_MIN)
    expect(clampAdCount(12)).toBe(10)
    expect(clampAdCount(37)).toBe(50)
    expect(clampAdCount(100)).toBe(ADS_MAX)
  })

  it('maps slider indices to tier counts', () => {
    ADS_OPTIONS.forEach((count, index) => {
      expect(getAdCountFromIndex(index)).toBe(count)
      expect(getAdCountIndex(count)).toBe(index)
    })
  })

  it('decreases per-ad price as quantity increases', () => {
    expect(getPricePerAd(ADS_MIN)).toBeGreaterThan(getPricePerAd(ADS_MAX))
  })

  it('uses the approved tier ladder and defaults to 10 ads', () => {
    expect(ADS_DEFAULT).toBe(10)
    expect(ADS_OPTIONS.map((count) => getTotalPrice(count))).toEqual([
      249,
      399,
      699,
      1499,
      2499,
    ])
  })

  it('prices 20 ads at $699', () => {
    expect(getTotalPrice(20)).toBe(699)
    expect(getPricePerAd(20)).toBe(34.95)
  })

  it('returns consistent order totals', () => {
    const order = getOrderSummary(20)
    expect(order.adCount).toBe(20)
    expect(order.total).toBe(699)
    expect(order.savings).toBeGreaterThan(0)
  })

  it('offers one-time and monthly delivery schedules', () => {
    expect(DELIVERY_SCHEDULES.map((option) => option.id)).toEqual(['one-time', 'monthly'])
    expect(getDeliveryScheduleLabel('monthly')).toBe('Monthly')
  })
})
