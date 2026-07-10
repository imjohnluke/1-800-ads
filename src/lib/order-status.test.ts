import { describe, expect, it } from 'vitest'
import {
  getStatusIndex,
  getStatusProgress,
  normalizeOrderStatus,
  ORDER_STATUS_PIPELINE,
  packTypeForAdCount,
  parseAdCountFromPackType,
} from './order-status'

describe('order-status', () => {
  it('normalizes unknown statuses to the raw value', () => {
    expect(normalizeOrderStatus('unknown')).toBe('unknown')
  })

  it('matches pipeline statuses case-insensitively', () => {
    expect(normalizeOrderStatus('in design')).toBe('In Design')
  })

  it('calculates progress across the pipeline', () => {
    expect(getStatusIndex('Done')).toBe(ORDER_STATUS_PIPELINE.length - 1)
    expect(getStatusProgress('Done')).toBe(100)
    expect(getStatusProgress('New Order')).toBe(0)
  })

  it('maps pack types to ad counts', () => {
    expect(packTypeForAdCount(10)).toBe('10 ads')
    expect(parseAdCountFromPackType('20 ads')).toBe(20)
  })
})
