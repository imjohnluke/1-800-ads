export const ADS_MIN = 5
export const ADS_MAX = 50
export const ADS_DEFAULT = 10
export const ADS_RECURRING_MIN = 20

export type DeliverySchedule = 'one-time' | 'bi-weekly' | 'weekly'

export const DELIVERY_SCHEDULES = [
  { id: 'one-time' as const, label: 'One-time', description: 'Single batch' },
  { id: 'bi-weekly' as const, label: 'Bi-weekly', description: 'Every 2 weeks' },
  { id: 'weekly' as const, label: 'Weekly', description: 'Every week' },
]

/** Per-ad price at minimum quantity (USD) */
export const ADS_RATE_HIGH = 80
/** Per-ad price at maximum quantity (USD) */
export const ADS_RATE_LOW = 55

export const ADS_QUICK_PICKS = [5, 10, 20, 30, 50] as const

export const ADS_INCLUDED = [
  'Conversion focused',
  'Every aspect ratio',
  'Concept, copy + design',
  'Delivered at your cadence',
] as const

export function clampAdCount(value: number): number {
  return Math.min(ADS_MAX, Math.max(ADS_MIN, Math.round(value)))
}

export function qualifiesForRecurringDelivery(adCount: number): boolean {
  return clampAdCount(adCount) >= ADS_RECURRING_MIN
}

export function getDeliveryScheduleLabel(schedule: DeliverySchedule): string {
  return DELIVERY_SCHEDULES.find((option) => option.id === schedule)?.label ?? 'One-time'
}

/** Volume-adjusted price per ad (USD) */
export function getPricePerAd(adCount: number): number {
  const count = clampAdCount(adCount)
  const t = (count - ADS_MIN) / (ADS_MAX - ADS_MIN)
  const perAd = ADS_RATE_HIGH - t * (ADS_RATE_HIGH - ADS_RATE_LOW)
  return Math.round(perAd * 100) / 100
}

export function getTotalPrice(adCount: number): number {
  const count = clampAdCount(adCount)
  return Math.round(count * getPricePerAd(count))
}

/** Savings vs buying every ad at the 5-ad rate */
export function getSavings(adCount: number): number {
  const count = clampAdCount(adCount)
  const listTotal = count * ADS_RATE_HIGH
  return Math.max(0, listTotal - getTotalPrice(count))
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })
}

export function getOrderSummary(adCount: number) {
  const count = clampAdCount(adCount)
  const pricePerAd = getPricePerAd(count)
  const total = getTotalPrice(count)
  const savings = getSavings(count)

  return {
    adCount: count,
    pricePerAd,
    total,
    savings,
    label: `${count} Static Ad${count === 1 ? '' : 's'}`,
  }
}
