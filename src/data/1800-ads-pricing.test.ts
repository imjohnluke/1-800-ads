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
  getDeliveryEstimate,
  formatUsd,
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

  it('uses the approved tier ladder and defaults to 5 ads', () => {
    expect(ADS_DEFAULT).toBe(5)
    expect(ADS_OPTIONS.map((count) => getTotalPrice(count))).toEqual([
      199,
      349,
      599,
      1249,
      1999,
    ])
  })

  it('prices 5 ads at $199', () => {
    expect(getTotalPrice(5)).toBe(199)
    expect(getPricePerAd(5)).toBe(39.8)
  })

  it('shows two digits for cents while leaving whole-dollar prices clean', () => {
    expect(formatUsd(39.8)).toBe('$39.80')
    expect(formatUsd(39.9)).toBe('$39.90')
    expect(formatUsd(199)).toBe('$199')
  })

  it('prices 20 ads at $599', () => {
    expect(getTotalPrice(20)).toBe(599)
    expect(getPricePerAd(20)).toBe(29.95)
  })

  it('reduces the per-ad price at every larger tier', () => {
    const rates = ADS_OPTIONS.map(getPricePerAd)
    rates.slice(1).forEach((rate, index) => {
      expect(rate).toBeLessThan(rates[index])
    })
  })

  it('returns consistent order totals', () => {
    const order = getOrderSummary(20)
    expect(order.adCount).toBe(20)
    expect(order.total).toBe(599)
    expect(order.savings).toBeGreaterThan(0)
  })

  it('offers one-time and monthly delivery schedules', () => {
    expect(DELIVERY_SCHEDULES.map((option) => option.id)).toEqual(['one-time', 'monthly'])
    expect(getDeliveryScheduleLabel('monthly')).toBe('Monthly')
  })

  it('returns the estimated delivery time for each package', () => {
    expect(ADS_OPTIONS.map(getDeliveryEstimate)).toEqual([
      '12 hours',
      '24 hours',
      '48 hours',
      '72 hours',
      '3–5 days',
    ])
  })
})
