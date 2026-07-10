export const ADS_OPTIONS = [5, 10, 20, 50, 100] as const

export type AdCountOption = (typeof ADS_OPTIONS)[number]

export const ADS_MIN = ADS_OPTIONS[0]
export const ADS_MAX = ADS_OPTIONS[ADS_OPTIONS.length - 1]
export const ADS_DEFAULT: AdCountOption = 10

export type DeliverySchedule = 'one-time' | 'monthly'

export const DELIVERY_SCHEDULES = [
  { id: 'one-time' as const, label: 'One-time', description: 'Single batch' },
  { id: 'monthly' as const, label: 'Monthly', description: 'Every month' },
]

/** Fixed order total per tier (USD) */
export const ADS_TIER_PRICES: Record<AdCountOption, number> = {
  5: 350,
  10: 550,
  20: 1000,
  50: 2100,
  100: 3800,
}

/** Per-ad rate at the smallest tier — used for savings comparison */
export const ADS_BASE_RATE = ADS_TIER_PRICES[5] / 5

export const ADS_QUICK_PICKS = ADS_OPTIONS

export const ADS_INCLUDED = [
  'Conversion focused',
  'Every aspect ratio',
  'Concept, copy + design',
  'Delivered at your cadence',
] as const

export function snapAdCount(value: number): AdCountOption {
  if (!Number.isFinite(value)) return ADS_DEFAULT

  let nearest = ADS_OPTIONS[0]
  let smallestDiff = Math.abs(value - nearest)

  for (const option of ADS_OPTIONS) {
    const diff = Math.abs(value - option)
    if (diff < smallestDiff) {
      nearest = option
      smallestDiff = diff
    }
  }

  return nearest
}

export function clampAdCount(value: number): AdCountOption {
  return snapAdCount(value)
}

export function getAdCountIndex(adCount: number): number {
  return ADS_OPTIONS.indexOf(clampAdCount(adCount))
}

export function getAdCountFromIndex(index: number): AdCountOption {
  const clamped = Math.min(ADS_OPTIONS.length - 1, Math.max(0, Math.round(index)))
  return ADS_OPTIONS[clamped]
}

export function getDeliveryScheduleLabel(schedule: DeliverySchedule): string {
  return DELIVERY_SCHEDULES.find((option) => option.id === schedule)?.label ?? 'One-time'
}

export function getPricePerAd(adCount: number): number {
  const count = clampAdCount(adCount)
  return Math.round((ADS_TIER_PRICES[count] / count) * 100) / 100
}

export function getTotalPrice(adCount: number): number {
  return ADS_TIER_PRICES[clampAdCount(adCount)]
}

/** Savings vs buying every ad at the 5-ad rate */
export function getSavings(adCount: number): number {
  const count = clampAdCount(adCount)
  const listTotal = count * ADS_BASE_RATE
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
